import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('copilote cuisine', () => {
  test('sans IA configurée : points réels du jour, annoncés comme calculés sans IA', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA, 10)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k' })
    vi.stubEnv('SMART_MENU_MODEL', '')
    const result = await adminA.action(api.copilot.brief, { date: WEEK, useAi: true })
    expect(result.source).toBe('rules')
    expect(result.notice).toMatch(/non configurée/)
    expect(result.summary).toBeNull()
    expect(result.points.map((p) => p.kind)).toEqual(['prepared_unknown', 'no_recipe'])
    await adminA.mutation(api.production.recordPrepared, { menuItemId, portions: 4, idempotencyKey: 'p' })
    const after = await adminA.action(api.copilot.brief, { date: WEEK, useAi: false })
    expect(after.points[0]).toMatchObject({ kind: 'surplus', values: { n: 3 } })
  })

  test('droits : usager refusé ; autre établissement ne voit rien', async () => {
    const { adminA, studentA, adminB } = await setupCanteens()
    await publishedLunch(adminA, 10)
    await expect(studentA.action(api.copilot.brief, { date: WEEK, useAi: false })).rejects.toThrow(/cuisine/)
    expect((await adminB.action(api.copilot.brief, { date: WEEK, useAi: false })).points).toEqual([])
  })

  test('date invalide refusée', async () => {
    const { adminA } = await setupCanteens()
    await expect(adminA.action(api.copilot.brief, { date: '2026-02-31', useAi: false })).rejects.toThrow(/Date invalide/)
  })
})
