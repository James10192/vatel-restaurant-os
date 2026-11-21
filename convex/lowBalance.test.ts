import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import {
  BEFORE_CUTOFF,
  WEEK,
  createDish,
  publishedLunch,
  setupCanteens,
} from '../tests/convex-fixture'
import type { Fixture } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

const lowBalanceJobs = (t: Fixture['t']) =>
  t.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect()).filter(
      (job) => (job.args[0] as { kind?: string }).kind === 'lowBalance',
    ),
  )

/** Déjeuner et dîner du lundi à 1 500 FCFA. */
async function twoMeals(admin: Fixture['adminA']) {
  const lunch = await publishedLunch(admin)
  const dishId = await createDish(admin, 'Garba', 1500)
  const dinner = await admin.mutation(api.menus.addItem, {
    date: WEEK,
    service: 'dinner',
    dishId,
    capacity: 50,
  })
  await admin.mutation(api.menus.publishWeek, { weekStart: WEEK })
  return { lunch, dinner }
}

const topUp = (user: Fixture['studentA'], amountXof: number, key: string) =>
  user.mutation(api.wallet.topUpDemo, { amountXof, idempotencyKey: key })
const book = (
  user: Fixture['studentA'],
  menuItemId: Awaited<ReturnType<typeof publishedLunch>>,
  key: string,
) => user.mutation(api.bookings.book, { menuItemId, idempotencyKey: key })

describe('alerte solde bas', () => {
  test('une seule alerte au franchissement du seuil, pour ce membre seulement', async () => {
    const { t, adminA, studentA } = await setupCanteens()
    const { lunch, dinner } = await twoMeals(adminA)
    await topUp(studentA, 3000, 'r1')
    await book(studentA, lunch, 'b1') // 3 000 -> 1 500 : franchissement
    const jobs = await lowBalanceJobs(t)
    expect(jobs).toHaveLength(1)
    const profile = await t.run((ctx) =>
      ctx.db
        .query('profiles')
        .withIndex('by_auth_user', (q) => q.eq('authUserId', 'student-a'))
        .unique(),
    )
    expect(jobs[0].args[0]).toMatchObject({
      target: { profileId: profile?._id },
    })

    await book(studentA, dinner, 'b2') // 1 500 -> 0 : déjà sous le seuil, pas de nouvelle alerte
    expect(await lowBalanceJobs(t)).toHaveLength(1)
  })

  test('solde qui reste au-dessus du seuil : aucune alerte', async () => {
    const { t, adminA, studentA } = await setupCanteens()
    const { lunch } = await twoMeals(adminA)
    await topUp(studentA, 5000, 'r1')
    await book(studentA, lunch, 'b1') // 5 000 -> 3 500
    expect(await lowBalanceJobs(t)).toHaveLength(0)
  })

  test('après une recharge, un nouveau franchissement déclenche une nouvelle alerte', async () => {
    const { t, adminA, studentA } = await setupCanteens()
    const { lunch, dinner } = await twoMeals(adminA)
    await topUp(studentA, 2500, 'r1')
    await book(studentA, lunch, 'b1') // 2 500 -> 1 000
    await topUp(studentA, 2000, 'r2') // 3 000
    await book(studentA, dinner, 'b2') // 3 000 -> 1 500
    expect(await lowBalanceJobs(t)).toHaveLength(2)
  })
})
