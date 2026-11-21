import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, createDish, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

async function scenario() {
  const fixture = await setupCanteens()
  const { t, ids, adminA, studentA, studentA2 } = fixture
  await t.run(async (ctx) => {
    await ctx.db.insert('profiles', { authUserId: 'dist-a', canteenId: ids.a, role: 'distribution', displayName: 'Agent' })
    await ctx.db.insert('profiles', { authUserId: 'chef-a', canteenId: ids.a, role: 'chef' })
  })
  const dishId = await createDish(adminA, 'Garba')
  const today = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 20 })
  const tomorrow = await adminA.mutation(api.menus.addItem, { date: addDays(WEEK, 1), service: 'lunch', dishId, capacity: 20 })
  await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
  for (const [user, key] of [[studentA, 'a'], [studentA2, 'b']] as const) {
    await user.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: `t${key}` })
    await user.mutation(api.bookings.book, { menuItemId: today, idempotencyKey: key })
  }
  return { ...fixture, today, tomorrow, dist: t.withIdentity({ subject: 'dist-a' }), chef: t.withIdentity({ subject: 'chef-a' }) }
}

describe('comptoir', () => {
  test('recherche par nom (casse, accents), 2 caractères minimum, puis remise manuelle par la distribution', async () => {
    const { dist } = await scenario()
    expect(await dist.query(api.counter.searchDiner, { date: WEEK, name: 'n' })).toEqual([])
    const found = await dist.query(api.counter.searchDiner, { date: WEEK, name: 'STUDENT-A2' })
    expect(found.map((f) => f.diner)).toEqual(['Nom student-a2'])
    await dist.mutation(api.admin.markPickedUp, { bookingId: found[0].bookingId })
    expect((await dist.query(api.counter.searchDiner, { date: WEEK, name: 'student-a2' }))[0].status).toBe('picked_up')
  })

  test('servis sans réservation : comptés le jour même, idempotents, visibles dans la synthèse', async () => {
    const { dist, today, tomorrow } = await scenario()
    await dist.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: 'w1' })
    await dist.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: 'w1' })
    await dist.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: 'w2' })
    await expect(dist.mutation(api.counter.recordWalkIn, { menuItemId: tomorrow, idempotencyKey: 'w3' })).rejects.toThrow(/jour même/)
    expect((await dist.query(api.admin.daySummary, { date: WEEK })).totals.walkIns).toBe(2)
  })

  test('l’historique mesure les passages et les propose ensuite', async () => {
    const { adminA, dist, today, tomorrow } = await scenario()
    for (const key of ['w1', 'w2', 'w3']) await dist.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: key })
    vi.setSystemTime(new Date(`${addDays(WEEK, 1)}T08:00:00Z`))
    const { history, services } = await adminA.query(api.productionPlan.dishHistory, { menuItemId: tomorrow })
    expect(services[0].walkIns).toBe(3)
    expect(history.avgWalkIns).toBe(3)
  })

  test('droits : usager et cuisine refusés au comptoir ; autre établissement isolé', async () => {
    const { studentA, chef, adminB, today } = await scenario()
    await expect(studentA.query(api.counter.searchDiner, { date: WEEK, name: 'nom' })).rejects.toThrow(/distribution/)
    await expect(chef.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: 'x' })).rejects.toThrow(/distribution/)
    expect(await adminB.query(api.counter.searchDiner, { date: WEEK, name: 'nom' })).toEqual([])
    await expect(adminB.mutation(api.counter.recordWalkIn, { menuItemId: today, idempotencyKey: 'y' })).rejects.toThrow(/introuvable/)
  })
})
