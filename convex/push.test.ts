import { describe, expect, test } from 'vitest'
import { api, internal } from './_generated/api'
import { isAllowedPushEndpoint } from './lib/notifications'
import {
  WEEK,
  createDish,
  setupCanteens as setup,
} from '../tests/convex-fixture'

const KEYS = {
  p256dh:
    'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const device = (id: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  ...KEYS,
})

describe('services push autorisés (anti-SSRF)', () => {
  test.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGx',
    'https://jmt17.google.com/fcm/send/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepte %s', (endpoint) =>
    expect(isAllowedPushEndpoint(endpoint)).toBe(true),
  )

  test.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.test/x',
    'https://evil.test/push',
    'https://fcm.googleapis.com:8443/x',
    'https://user:pw@fcm.googleapis.com/x',
    'https://169.254.169.254/latest',
    'pas une url',
  ])('refuse %s', (endpoint) =>
    expect(isAllowedPushEndpoint(endpoint)).toBe(false),
  )
})

describe('abonnements push', () => {
  test('compte non rattaché : refusé', async () => {
    const { stranger } = await setup()
    await expect(
      stranger.mutation(api.push.subscribe, device('x')),
    ).rejects.toThrow(/non rattaché/)
    await expect(stranger.query(api.push.publicKey, {})).rejects.toThrow(
      /non rattaché/,
    )
  })

  test('endpoint hors services push ou clés invalides : refusé', async () => {
    const { studentA } = await setup()
    await expect(
      studentA.mutation(api.push.subscribe, {
        ...device('x'),
        endpoint: 'https://evil.test/x',
      }),
    ).rejects.toThrow(/invalide/)
    await expect(
      studentA.mutation(api.push.subscribe, { ...device('x'), auth: 'a b' }),
    ).rejects.toThrow(/invalide/)
  })

  test('idempotent, puis réattribué au compte qui réactive le même appareil', async () => {
    const { t, studentA, studentA2 } = await setup()
    await studentA.mutation(api.push.subscribe, device('tel'))
    await studentA.mutation(api.push.subscribe, device('tel'))
    await studentA2.mutation(api.push.subscribe, device('tel'))
    const rows = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').collect(),
    )
    expect(rows).toHaveLength(1)
    const owner = await t.run((ctx) => ctx.db.get(rows[0].profileId))
    expect(owner?.authUserId).toBe('student-a2')
  })

  test('un membre ne peut pas retirer l’appareil d’un autre', async () => {
    const { t, studentA, studentA2 } = await setup()
    await studentA.mutation(api.push.subscribe, device('tel'))
    await studentA2.mutation(api.push.unsubscribe, {
      endpoint: device('tel').endpoint,
    })
    expect(
      await t.run((ctx) => ctx.db.query('pushSubscriptions').collect()),
    ).toHaveLength(1)
    await studentA.mutation(api.push.unsubscribe, {
      endpoint: device('tel').endpoint,
    })
    expect(
      await t.run((ctx) => ctx.db.query('pushSubscriptions').collect()),
    ).toHaveLength(0)
  })

  test('test d’envoi : exige un appareil, vise seulement les appareils du membre', async () => {
    const { studentA } = await setup()
    await expect(studentA.mutation(api.push.sendTest, {})).rejects.toThrow(
      /Aucun appareil/,
    )
    await studentA.mutation(api.push.subscribe, device('tel'))
    expect(await studentA.mutation(api.push.sendTest, {})).toBe(1)
  })

  test('isolation : un envoi à l’établissement A n’atteint aucun appareil de B', async () => {
    const { t, ids, studentA, adminB } = await setup()
    await studentA.mutation(api.push.subscribe, device('a'))
    await adminB.mutation(api.push.subscribe, device('b'))
    const recipients = await t.query(internal.push.recipients, {
      target: { canteenId: ids.a },
      kind: 'menuPublished',
    })
    expect(recipients.map((r) => r.endpoint)).toEqual([device('a').endpoint])
  })

  test('publication de la semaine : notification planifiée seulement si des brouillons sont publiés', async () => {
    const { t, adminA } = await setup()
    const scheduled = () =>
      t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    expect(await scheduled()).toHaveLength(0)
    const dishId = await createDish(adminA)
    await adminA.mutation(api.menus.addItem, {
      date: WEEK,
      service: 'lunch',
      dishId,
      capacity: 10,
    })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    const jobs = await scheduled()
    expect(jobs).toHaveLength(1)
    expect(jobs[0].args[0]).toMatchObject({ kind: 'menuPublished' })
  })
})
