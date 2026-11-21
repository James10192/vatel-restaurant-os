import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

describe('notes et indicateurs', () => {
  test('note : repas retiré seulement, 1 à 5, modifiable ; reprise dans les indicateurs', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA, 10)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k' })
    await expect(studentA.mutation(api.ratings.rate, { bookingId, score: 4 })).rejects.toThrow(/retiré/)
    await adminA.mutation(api.admin.markPickedUp, { bookingId })
    await expect(studentA.mutation(api.ratings.rate, { bookingId, score: 6 })).rejects.toThrow(/1 à 5/)
    await expect(studentA2.mutation(api.ratings.rate, { bookingId, score: 3 })).rejects.toThrow(/introuvable/)
    await studentA.mutation(api.ratings.rate, { bookingId, score: 2 })
    await studentA.mutation(api.ratings.rate, { bookingId, score: 5 })
    expect(await studentA.query(api.ratings.mine, { from: WEEK })).toEqual([{ bookingId, score: 5 }])
    vi.setSystemTime(new Date(`${addDays(WEEK, 1)}T08:00:00Z`))
    const { rows, totals } = await adminA.query(api.analytics.period, { endDate: addDays(WEEK, 1), days: 7 })
    expect(rows).toHaveLength(7)
    expect(totals.rating).toEqual({ value: 5, count: 1 })
    expect(totals.pickupRate).toEqual({ value: 100, numerator: 1, denominator: 1 })
  })

  test('indicateurs : administration seulement, période 7 ou 30, établissement isolé', async () => {
    const { adminA, adminB, studentA } = await setupCanteens()
    await publishedLunch(adminA, 10)
    await expect(studentA.query(api.analytics.period, { endDate: WEEK, days: 7 })).rejects.toThrow(/administration/)
    await expect(adminA.query(api.analytics.period, { endDate: WEEK, days: 12 })).rejects.toThrow(/7 ou 30/)
    expect((await adminB.query(api.analytics.period, { endDate: WEEK, days: 7 })).totals.offers).toBe(0)
    expect((await adminA.query(api.analytics.period, { endDate: WEEK, days: 30 })).totals.offers).toBe(1)
  })
})
