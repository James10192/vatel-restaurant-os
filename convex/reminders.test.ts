import { afterEach, describe, expect, test, vi } from 'vitest'
import { api, internal } from './_generated/api'
import { WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import type { Fixture } from '../tests/convex-fixture'

/** Déjeuner du lundi : service 12:00, clôture 10:00 (politique par défaut), rappel entre 09:00 et 10:00. */
const at = (time: string) => vi.setSystemTime(new Date(`${WEEK}T${time}:00Z`))
afterEach(() => vi.useRealTimers())

const KEYS = {
  p256dh:
    'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const subscribe = (user: Fixture['studentA'], id: string) =>
  user.mutation(api.push.subscribe, {
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    ...KEYS,
  })

const reminderJobs = (t: Fixture['t']) =>
  t.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect())
      .map(
        (job) =>
          job.args[0] as {
            kind: string
            target: { profileIds?: Array<string> }
          },
      )
      .filter((args) => args.kind === 'lunchReminder'),
  )

const profileOf = (t: Fixture['t'], authUserId: string) =>
  t.run(
    async (ctx) =>
      (await ctx.db
        .query('profiles')
        .withIndex('by_auth_user', (q) => q.eq('authUserId', authUserId))
        .unique())!._id,
  )

async function book(
  user: Fixture['studentA'],
  menuItemId: Awaited<ReturnType<typeof publishedLunch>>,
) {
  await user.mutation(api.wallet.topUpDemo, {
    amountXof: 5000,
    idempotencyKey: 'recharge',
  })
  await user.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'resa' })
}

describe('rappel avant la clôture des réservations', () => {
  test('un seul rappel, aux seuls abonnés de l’établissement qui n’ont pas réservé', async () => {
    vi.useFakeTimers()
    at('09:30')
    const fx = await setupCanteens()
    const itemId = await publishedLunch(fx.adminA)
    await subscribe(fx.studentA, 'a')
    await subscribe(fx.studentA2, 'a2')
    await book(fx.studentA2, itemId)
    await subscribe(fx.adminB, 'b')

    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 1,
    })
    const jobs = await reminderJobs(fx.t)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].target.profileIds).toEqual([
      await profileOf(fx.t, 'student-a'),
    ])

    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 0,
    })
    expect(await reminderJobs(fx.t)).toHaveLength(1)
  })

  test('hors de l’heure précédant la clôture : aucun rappel', async () => {
    vi.useFakeTimers()
    at('08:30')
    const fx = await setupCanteens()
    await publishedLunch(fx.adminA)
    await subscribe(fx.studentA, 'a')
    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 0,
    })
    at('10:00')
    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 0,
    })
  })

  test('service complet ou sans offre publiée : aucun rappel', async () => {
    vi.useFakeTimers()
    at('09:30')
    const fx = await setupCanteens()
    await subscribe(fx.studentA, 'a')
    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 0,
    })
    const itemId = await publishedLunch(fx.adminA, 1)
    await book(fx.studentA2, itemId)
    expect(await fx.t.mutation(internal.reminders.sendDue, {})).toEqual({
      reminders: 0,
    })
    expect(await reminderJobs(fx.t)).toHaveLength(0)
  })
})
