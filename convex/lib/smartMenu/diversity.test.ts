import { describe, expect, test } from 'vitest'
import { alternativesOf, evaluate, planByRules } from './rules'
import type { OfferRow } from './rules'

const NOW = Date.parse('2026-11-23T08:00:00Z')
const row = (id: string, date: string, dishName: string, priceXof: number): OfferRow => ({
  id,
  date,
  service: 'lunch',
  dishName,
  priceXof,
  capacity: 10,
  remaining: 10,
  bookableUntil: NOW + 86_400_000 * 7,
  allergens: { status: 'declared', present: [], traces: [] },
  alreadyBooked: false,
})
const rows = [row('a1', '2026-11-23', 'Garba', 1000), row('a2', '2026-11-23', 'Alloco', 1200), row('b1', '2026-11-24', 'Garba', 1000), row('b2', '2026-11-24', 'Foutou', 1300)]
const request = (budgetXof: number) => ({ days: ['2026-11-23', '2026-11-24'], budgetXof, service: 'any' as const, avoid: [] })

describe('diversité et alternatives', () => {
  test('même plat deux jours : remplacé si le budget le permet', () => {
    const evaluation = evaluate(rows, request(2300), NOW)
    const plan = planByRules(evaluation, request(2300))
    expect(plan.picks.map((p) => [p.offer.date, p.offer.dishName])).toEqual([['2026-11-23', 'Alloco'], ['2026-11-24', 'Garba']])
    expect(plan.totalXof).toBe(2200)
  })

  test('budget serré : on garde la couverture, quitte à répéter le plat', () => {
    const plan = planByRules(evaluate(rows, request(2000), NOW), request(2000))
    expect(plan.picks.map((p) => p.offer.dishName)).toEqual(['Garba', 'Garba'])
  })

  test('alternatives : autres offres éligibles du même jour seulement', () => {
    const evaluation = evaluate(rows, request(5000), NOW)
    expect(alternativesOf(evaluation, rows[0]).map((o) => o.id)).toEqual(['a2'])
  })
})
