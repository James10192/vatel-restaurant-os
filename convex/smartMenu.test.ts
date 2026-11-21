import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api, internal } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, createDish, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { QUOTAS } from './lib/smartMenu/contract'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const TUESDAY = '2026-11-24'
const ask = (over: Partial<Parameters<typeof baseArgs>[0]> = {}) => baseArgs(over)
function baseArgs(over: { days?: Array<string>; budgetXof?: number; useAi?: boolean; wish?: string; avoid?: Array<string> }) {
  return { days: [WEEK, TUESDAY], budgetXof: 5000, service: 'any' as const, avoid: [], useAi: false, ...over }
}

describe('Smart Menu : lecture autorisée seulement', () => {
  test('nominal sans IA : plats publiés, vrais prix, disponibilités et allergènes', async () => {
    const { adminA, studentA } = await setupCanteens()
    await publishedLunch(adminA, 50, 1500)
    await publishedLunch(adminA, 5, 1000, TUESDAY)
    const result = await studentA.action(api.smartMenu.suggest, ask())
    expect(result.source).toBe('rules')
    expect(result.totalXof).toBe(2500)
    expect(result.picks.map((p) => [p.date, p.priceXof, p.remaining])).toEqual([
      [WEEK, 1500, 50],
      [TUESDAY, 1000, 5],
    ])
    expect(result.picks[0].allergens).toEqual({ status: 'declared', present: ['Poisson'], traces: [] })
  })

  test('brouillon jamais proposé ; jour sans menu signalé', async () => {
    const { adminA, studentA } = await setupCanteens()
    const dishId = await createDish(adminA, 'Brouillon')
    await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
    const result = await studentA.action(api.smartMenu.suggest, ask())
    expect(result.picks).toHaveLength(0)
    expect(result.uncovered).toEqual([
      { date: WEEK, reason: 'no_menu' },
      { date: TUESDAY, reason: 'no_menu' },
    ])
  })

  test('isolation : les menus d’un autre établissement sont invisibles', async () => {
    const { adminB, studentA } = await setupCanteens()
    await publishedLunch(adminB, 50, 800)
    expect((await studentA.action(api.smartMenu.suggest, ask())).picks).toHaveLength(0)
  })

  test('budget dépassé : jamais au-delà du budget', async () => {
    const { adminA, studentA } = await setupCanteens()
    await publishedLunch(adminA, 50, 1500)
    await publishedLunch(adminA, 50, 1000, TUESDAY)
    const result = await studentA.action(api.smartMenu.suggest, ask({ budgetXof: 1200 }))
    expect(result.totalXof).toBe(1000)
    expect(result.uncovered).toEqual([{ date: WEEK, reason: 'budget' }])
  })

  test('gérant, compte non rattaché et anonyme refusés', async () => {
    const { t, adminA, stranger } = await setupCanteens()
    await expect(adminA.action(api.smartMenu.suggest, ask())).rejects.toThrow(/réservée aux usagers/)
    await expect(stranger.action(api.smartMenu.suggest, ask())).rejects.toThrow(/non rattaché/)
    await expect(t.action(api.smartMenu.suggest, ask())).rejects.toThrow(/non rattaché/)
  })

  test('entrées invalides refusées : jour passé, date impossible, budget décimal, souhait trop long', async () => {
    const { studentA } = await setupCanteens()
    await expect(studentA.action(api.smartMenu.suggest, ask({ days: ['2026-11-20'] }))).rejects.toThrow(/jours à venir/)
    await expect(studentA.action(api.smartMenu.suggest, ask({ days: ['2026-02-31'] }))).rejects.toThrow(/jours à venir/)
    await expect(studentA.action(api.smartMenu.suggest, ask({ budgetXof: 10.5 }))).rejects.toThrow(/Budget invalide/)
    await expect(studentA.action(api.smartMenu.suggest, ask({ wish: 'x'.repeat(501) }))).rejects.toThrow(/trop long/)
  })
})

describe('Smart Menu : IA bornée', () => {
  test('IA non configurée : repli sans IA annoncé, même résultat que les règles', async () => {
    const { adminA, studentA } = await setupCanteens()
    await publishedLunch(adminA, 50, 1500)
    vi.stubEnv('SMART_MENU_MODEL', '')
    const result = await studentA.action(api.smartMenu.suggest, ask({ useAi: true }))
    expect(result).toMatchObject({ source: 'rules', notice: expect.stringMatching(/non configurée/), totalXof: 1500 })
  })

  test('modèle hors liste autorisée : IA désactivée', async () => {
    const { adminA, studentA } = await setupCanteens()
    await publishedLunch(adminA, 50, 1500)
    vi.stubEnv('AI_GATEWAY_API_KEY', 'factice')
    vi.stubEnv('SMART_MENU_MODEL', 'nvidia/nemotron-3.5-lightning-free')
    const result = await studentA.action(api.smartMenu.suggest, ask({ useAi: true }))
    expect(result.notice).toMatch(/non configurée/)
  })

  test('quota par usager et par jour appliqué côté serveur', async () => {
    const { studentA, studentA2 } = await setupCanteens()
    const now = BEFORE_CUTOFF.getTime()
    for (let i = 0; i < QUOTAS.perStudentPerDay; i++) {
      expect(await studentA.mutation(internal.smartMenu.reserveAiCall, { now })).not.toBeNull()
    }
    expect(await studentA.mutation(internal.smartMenu.reserveAiCall, { now })).toBeNull()
    expect(await studentA2.mutation(internal.smartMenu.reserveAiCall, { now })).not.toBeNull()
    expect(await studentA.mutation(internal.smartMenu.reserveAiCall, { now: now + 86_400_000 })).not.toBeNull()
  })
})
