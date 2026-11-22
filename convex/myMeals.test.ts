import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

const first = (numItems: number) => ({ paginationOpts: { numItems, cursor: null } })

describe('Mes repas paginés', () => {
  test('à venir par date, pages bornées ; historique séparé ; chiffres de l’en-tête', async () => {
    const { adminA, studentA } = await setupCanteens()
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 20000, idempotencyKey: 't' })
    const ids = []
    for (let i = 0; i < 3; i++) ids.push(await publishedLunch(adminA, 10, 1500, addDays(WEEK, i)))
    const booked = []
    for (const [i, menuItemId] of ids.entries()) booked.push((await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: `k${i}` })).bookingId)
    await studentA.mutation(api.bookings.cancel, { bookingId: booked[2] })

    const page = await studentA.query(api.myMeals.upcoming, first(1))
    expect(page.page.map((b) => b.date)).toEqual([WEEK])
    expect(page.isDone).toBe(false)
    const rest = await studentA.query(api.myMeals.upcoming, { paginationOpts: { numItems: 10, cursor: page.continueCursor } })
    expect(rest.page.map((b) => b.date)).toEqual([addDays(WEEK, 1)])

    expect((await studentA.query(api.myMeals.history, first(10))).page.map((b) => b.status)).toEqual(['cancelled'])
    expect(await studentA.query(api.myMeals.summary, {})).toEqual({ upcoming: 2, engagedXof: 3000 })
  })

  test('chacun ne lit que ses propres repas', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    await studentA.mutation(api.bookings.book, { menuItemId: await publishedLunch(adminA, 10), idempotencyKey: 'k' })
    expect((await studentA2.query(api.myMeals.upcoming, first(10))).page).toEqual([])
    expect(await studentA2.query(api.myMeals.summary, {})).toEqual({ upcoming: 0, engagedXof: 0 })
  })
})
