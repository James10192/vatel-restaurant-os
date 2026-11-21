import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

const page = { numItems: 25, cursor: null }

async function scenario() {
  const fixture = await setupCanteens()
  const { adminA, studentA, studentA2 } = fixture
  const menuItemId = await publishedLunch(adminA, 10)
  for (const [user, key] of [
    [studentA, 'a'],
    [studentA2, 'b'],
  ] as const) {
    await user.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: `t-${key}` })
  }
  const { bookingId: kept } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k1' })
  const { bookingId: dropped } = await studentA2.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k2' })
  await studentA2.mutation(api.bookings.cancel, { bookingId: dropped })
  return { ...fixture, menuItemId, kept, dropped }
}

describe('commandes du jour', () => {
  test('liste filtrée par statut et service, noms affichés sans e-mail', async () => {
    const { adminA } = await scenario()
    const all = await adminA.query(api.admin.dayOrders, { date: WEEK, paginationOpts: page })
    expect(all.page).toHaveLength(2)
    expect(all.page[0]).not.toHaveProperty('email')
    const confirmed = await adminA.query(api.admin.dayOrders, { date: WEEK, status: 'confirmed', paginationOpts: page })
    expect(confirmed.page.map((o) => o.diner)).toEqual(['Nom student-a'])
    const lunchCancelled = await adminA.query(api.admin.dayOrders, {
      date: WEEK,
      service: 'lunch',
      status: 'cancelled',
      paginationOpts: page,
    })
    expect(lunchCancelled.page.map((o) => o.diner)).toEqual(['Nom student-a2'])
    const dinner = await adminA.query(api.admin.dayOrders, { date: WEEK, service: 'dinner', paginationOpts: page })
    expect(dinner.page).toHaveLength(0)
  })

  test('usager et admin d’un autre établissement : aucun accès', async () => {
    const { studentA, adminB } = await scenario()
    await expect(studentA.query(api.admin.dayOrders, { date: WEEK, paginationOpts: page })).rejects.toThrow(/distribution/)
    expect((await adminB.query(api.admin.dayOrders, { date: WEEK, paginationOpts: page })).page).toHaveLength(0)
    expect((await adminB.query(api.admin.daySummary, { date: WEEK })).offers).toHaveLength(0)
  })
})

describe('remise et synthèse', () => {
  test('remise unique ; annulée non remise ; synthèse cohérente et temps réel', async () => {
    const { adminA, adminB, kept, dropped } = await scenario()
    await expect(adminB.mutation(api.admin.markPickedUp, { bookingId: kept })).rejects.toThrow(/introuvable/)
    await adminA.mutation(api.admin.markPickedUp, { bookingId: kept })
    await expect(adminA.mutation(api.admin.markPickedUp, { bookingId: kept })).rejects.toThrow(/déjà remis/)
    await expect(adminA.mutation(api.admin.markPickedUp, { bookingId: dropped })).rejects.toThrow(/annulée/)
    const { offers, totals } = await adminA.query(api.admin.daySummary, { date: WEEK })
    expect(offers).toHaveLength(1)
    expect(totals).toEqual({ capacity: 10, confirmed: 0, pickedUp: 1, cancelled: 1, remaining: 9, walkIns: 0, demoAmountXof: 1500 })
  })

  test('un repas remis ne peut plus être annulé par l’usager', async () => {
    const { adminA, studentA, kept } = await scenario()
    await adminA.mutation(api.admin.markPickedUp, { bookingId: kept })
    await expect(studentA.mutation(api.bookings.cancel, { bookingId: kept })).rejects.toThrow(/ne peut plus/)
  })
})
