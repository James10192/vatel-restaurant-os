import { describe, expect, test } from 'vitest'
import { evaluate, planByRules, sanitizeReason, validateAiPicks } from './rules'
import type { OfferRow, SmartRequest } from './rules'

const NOW = Date.parse('2026-11-23T08:00:00Z')
const LATER = Date.parse('2026-11-30T00:00:00Z')

function offer(id: string, date: string, priceXof: number, extra: Partial<OfferRow> = {}): OfferRow {
  return {
    id,
    date,
    service: 'lunch',
    dishName: `Plat ${id}`,
    priceXof,
    capacity: 10,
    remaining: 10,
    bookableUntil: LATER,
    allergens: { status: 'declared', present: [], traces: [] },
    alreadyBooked: false,
    ...extra,
  }
}

const request = (over: Partial<SmartRequest> = {}): SmartRequest => ({
  days: ['2026-11-23', '2026-11-24', '2026-11-25'],
  budgetXof: 5000,
  service: 'any',
  avoid: [],
  ...over,
})

describe('règles déterministes', () => {
  test('nominal : un repas par jour, le moins cher, total exact', () => {
    const rows = [offer('a', '2026-11-23', 1500), offer('b', '2026-11-23', 1000), offer('c', '2026-11-24', 1200)]
    const plan = planByRules(evaluate(rows, request(), NOW), request())
    expect(plan.picks.map((p) => p.offer.id)).toEqual(['b', 'c'])
    expect(plan.totalXof).toBe(2200)
    expect(plan.uncovered).toEqual([{ date: '2026-11-25', reason: 'no_menu' }])
  })

  test('budget insuffisant : couvre le maximum de jours, signale les jours hors budget', () => {
    const rows = [offer('a', '2026-11-23', 1500), offer('b', '2026-11-24', 1000), offer('c', '2026-11-25', 1200)]
    const req = request({ budgetXof: 2300 })
    const plan = planByRules(evaluate(rows, req, NOW), req)
    expect(plan.totalXof).toBe(2200)
    expect(plan.totalXof).toBeLessThanOrEqual(req.budgetXof)
    expect(plan.uncovered).toEqual([{ date: '2026-11-23', reason: 'budget' }])
  })

  test('complet, clos ou déjà réservé : jour indisponible', () => {
    const rows = [
      offer('full', '2026-11-23', 500, { remaining: 0 }),
      offer('closed', '2026-11-24', 500, { bookableUntil: NOW - 1 }),
      offer('mine', '2026-11-25', 500, { alreadyBooked: true }),
    ]
    const plan = planByRules(evaluate(rows, request(), NOW), request())
    expect(plan.picks).toHaveLength(0)
    expect(plan.uncovered.map((u) => u.reason)).toEqual(['unavailable', 'unavailable', 'unavailable'])
  })

  test('allergène évité (présent ou traces, accents ignorés) exclu ; allergènes inconnus exclus et comptés', () => {
    const rows = [
      offer('fish', '2026-11-23', 500, { allergens: { status: 'declared', present: ['Poisson'], traces: [] } }),
      offer('trace', '2026-11-24', 500, { allergens: { status: 'declared', present: [], traces: ['Arachide'] } }),
      offer('unknown', '2026-11-25', 500, { allergens: { status: 'unknown' } }),
    ]
    const req = request({ avoid: ['poisson', 'ARACHIDE'] })
    const evaluation = evaluate(rows, req, NOW)
    expect(evaluation.excludedUnknownAllergens).toBe(1)
    expect(planByRules(evaluation, req).picks).toHaveLength(0)
    expect(evaluation.uncovered.every((u) => u.reason === 'allergens')).toBe(true)
  })

  test('sans allergène évité, un plat aux allergènes inconnus reste proposé (badge affiché côté UI)', () => {
    const rows = [offer('unknown', '2026-11-23', 500, { allergens: { status: 'unknown' } })]
    const plan = planByRules(evaluate(rows, request(), NOW), request())
    expect(plan.picks[0].offer.allergens).toEqual({ status: 'unknown' })
  })
})

describe('validation de la proposition IA', () => {
  const rows = [offer('a', '2026-11-23', 1500), offer('b', '2026-11-24', 1000), offer('x', '2026-11-23', 900)]
  const req = request()
  const evaluation = evaluate(rows, req, NOW)

  test('proposition valide : prix relus en base, jamais fournis par le modèle', () => {
    const result = validateAiPicks([{ offerId: 'a', reason: 'Plat copieux.' }, { offerId: 'b', reason: 'Moins cher.' }], evaluation, req)
    expect(result.ok && result.plan.totalXof).toBe(2500)
  })

  test('offre inexistante, d’un autre établissement ou non réservable : rejet total', () => {
    expect(validateAiPicks([{ offerId: 'autre-tenant', reason: '' }], evaluation, req)).toEqual({
      ok: false,
      problem: 'offre inconnue ou non réservable',
    })
  })

  test('deux repas le même jour : rejet', () => {
    expect(validateAiPicks([{ offerId: 'a', reason: '' }, { offerId: 'x', reason: '' }], evaluation, req).ok).toBe(false)
  })

  test('dépassement de budget : rejet', () => {
    const tight = request({ budgetXof: 2000 })
    expect(validateAiPicks([{ offerId: 'a', reason: '' }, { offerId: 'b', reason: '' }], evaluate(rows, tight, NOW), tight)).toEqual({
      ok: false,
      problem: 'budget dépassé',
    })
  })

  test('explication rassurante sur allergènes ou santé supprimée ; caractères de contrôle retirés', () => {
    expect(sanitizeReason('Sans risque pour les allergiques')).toBeUndefined()
    expect(sanitizeReason('Bon pour la santé')).toBeUndefined()
    expect(sanitizeReason('Plat\u0007 copieux\n et local')).toBe('Plat copieux et local')
  })
})
