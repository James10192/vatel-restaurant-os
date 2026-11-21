import { describe, expect, test } from 'vitest'
import { api, internal } from './_generated/api'
import { setupCanteens } from '../tests/convex-fixture'
import type { Fixture } from '../tests/convex-fixture'

const KEYS = {
  p256dh:
    'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const endpoint = (id: string) => `https://fcm.googleapis.com/fcm/send/${id}`
const subscribe = (user: Fixture['studentA'], id: string) =>
  user.mutation(api.push.subscribe, { endpoint: endpoint(id), ...KEYS })

describe('choix du type de notifications', () => {
  test('tout est reçu par défaut ; une famille coupée puis réactivée ; idempotent', async () => {
    const { studentA } = await setupCanteens()
    const all = { menuPublished: true, bookingReminder: true, lowBalance: true }
    expect(await studentA.query(api.notificationPreferences.mine, {})).toEqual(
      all,
    )
    await studentA.mutation(api.notificationPreferences.set, {
      category: 'bookingReminder',
      enabled: false,
    })
    await studentA.mutation(api.notificationPreferences.set, {
      category: 'bookingReminder',
      enabled: false,
    })
    expect(await studentA.query(api.notificationPreferences.mine, {})).toEqual({
      ...all,
      bookingReminder: false,
    })
    await studentA.mutation(api.notificationPreferences.set, {
      category: 'bookingReminder',
      enabled: true,
    })
    expect(await studentA.query(api.notificationPreferences.mine, {})).toEqual(
      all,
    )
  })

  test('compte non rattaché : refusé', async () => {
    const { stranger } = await setupCanteens()
    await expect(
      stranger.query(api.notificationPreferences.mine, {}),
    ).rejects.toThrow(/non rattaché/)
    await expect(
      stranger.mutation(api.notificationPreferences.set, {
        category: 'lowBalance',
        enabled: false,
      }),
    ).rejects.toThrow(/non rattaché/)
  })

  test('à l’envoi : la famille coupée n’atteint plus ce membre, les autres familles et le test si', async () => {
    const { t, ids, studentA, studentA2 } = await setupCanteens()
    await subscribe(studentA, 'a')
    await subscribe(studentA2, 'a2')
    await studentA.mutation(api.notificationPreferences.set, {
      category: 'menuPublished',
      enabled: false,
    })
    const to = async (kind: 'menuPublished' | 'lowBalance' | 'test') =>
      (
        await t.query(internal.push.recipients, {
          target: { canteenId: ids.a },
          kind,
        })
      )
        .map((r) => r.endpoint)
        .sort()

    expect(await to('menuPublished')).toEqual([endpoint('a2')])
    expect(await to('lowBalance')).toEqual([endpoint('a'), endpoint('a2')])
    expect(await to('test')).toEqual([endpoint('a'), endpoint('a2')])
  })
})
