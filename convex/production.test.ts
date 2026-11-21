import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

/** Une offre de 10 portions, deux réservations dont une remise ; un chef et un agent de distribution dans A. */
async function scenario() {
  const fixture = await setupCanteens()
  const { t, ids, adminA, studentA, studentA2 } = fixture
  await t.run(async (ctx) => {
    await ctx.db.insert('profiles', { authUserId: 'chef-a', canteenId: ids.a, role: 'chef' })
    await ctx.db.insert('profiles', { authUserId: 'dist-a', canteenId: ids.a, role: 'distribution' })
  })
  const menuItemId = await publishedLunch(adminA, 10)
  for (const [user, key] of [
    [studentA, 'a'],
    [studentA2, 'b'],
  ] as const) {
    await user.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: `t-${key}` })
  }
  const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k1' })
  await studentA2.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k2' })
  await adminA.mutation(api.admin.markPickedUp, { bookingId })
  return { ...fixture, menuItemId, chefA: t.withIdentity({ subject: 'chef-a' }), distA: t.withIdentity({ subject: 'dist-a' }) }
}

describe('production du jour', () => {
  test('préparé inconnu puis saisi par le chef ; idempotent ; correction bornée par les pertes', async () => {
    const { chefA, menuItemId } = await scenario()
    const offer = async () => (await chefA.query(api.production.day, { date: WEEK })).offers[0]
    expect(await offer()).toMatchObject({ confirmed: 1, pickedUp: 1, prepared: null, capacity: 10 })
    await chefA.mutation(api.production.recordPrepared, { menuItemId, portions: 6, idempotencyKey: 'p1' })
    await chefA.mutation(api.production.recordPrepared, { menuItemId, portions: 6, idempotencyKey: 'p1' })
    expect((await offer()).prepared).toBe(6)
    await chefA.mutation(api.production.recordWaste, { menuItemId, portions: 3, reason: 'surplus', idempotencyKey: 'w1' })
    await expect(chefA.mutation(api.production.recordPrepared, { menuItemId, portions: -4, idempotencyKey: 'p2' })).rejects.toThrow(
      /déjà déclarées perdues/,
    )
    await chefA.mutation(api.production.recordPrepared, { menuItemId, portions: -2, idempotencyKey: 'p3' })
    expect(await offer()).toMatchObject({ prepared: 4, waste: { surplus: 3, not_picked_up: 0, kitchen: 0, quality: 0 } })
  })

  test('pertes : préparé requis, plafond préparé moins remis moins déjà perdu, valeurs invalides refusées', async () => {
    const { adminA, menuItemId } = await scenario()
    const waste = (portions: number, key: string) =>
      adminA.mutation(api.production.recordWaste, { menuItemId, portions, reason: 'kitchen', idempotencyKey: key })
    await expect(waste(1, 'w0')).rejects.toThrow(/d’abord les portions préparées/)
    await adminA.mutation(api.production.recordPrepared, { menuItemId, portions: 5, idempotencyKey: 'p1' })
    await expect(waste(5, 'w1')).rejects.toThrow(/Au plus 4 portions peuvent encore être déclarées/)
    await expect(waste(1.5, 'w2')).rejects.toThrow(/entier/)
    await expect(waste(-1, 'w3')).rejects.toThrow(/entier/)
    await waste(4, 'w4')
    const week = await adminA.query(api.production.wasteWeek, { endDate: WEEK })
    expect(week.at(-1)).toEqual({ date: WEEK, prepared: 5, served: 1, wasted: 4 })
    expect(week).toHaveLength(7)
  })

  test('aucune saisie pour un jour à venir', async () => {
    const { adminA } = await scenario()
    const future = await publishedLunch(adminA, 5, 1500, addDays(WEEK, 7))
    await expect(adminA.mutation(api.production.recordPrepared, { menuItemId: future, portions: 3, idempotencyKey: 'f' })).rejects.toThrow(
      /jour à venir/,
    )
  })

  test('droits : usager, distribution et autre établissement refusés ou isolés', async () => {
    const { studentA, distA, adminB, menuItemId } = await scenario()
    await expect(studentA.query(api.production.day, { date: WEEK })).rejects.toThrow(/cuisine/)
    await expect(distA.query(api.production.day, { date: WEEK })).rejects.toThrow(/cuisine/)
    await expect(distA.mutation(api.production.recordPrepared, { menuItemId, portions: 1, idempotencyKey: 'x' })).rejects.toThrow(/cuisine/)
    expect((await adminB.query(api.production.day, { date: WEEK })).offers).toHaveLength(0)
    await expect(adminB.mutation(api.production.recordPrepared, { menuItemId, portions: 1, idempotencyKey: 'x' })).rejects.toThrow(
      /introuvable/,
    )
  })

  test('une vraie annulation met à jour la situation (réactivité Convex) sans rien écrire en production', async () => {
    const { chefA, studentA2, t } = await scenario()
    const mine = await studentA2.query(api.bookings.mine, { from: WEEK })
    await studentA2.mutation(api.bookings.cancel, { bookingId: mine[0]._id })
    expect((await chefA.query(api.production.day, { date: WEEK })).offers[0]).toMatchObject({ confirmed: 0, cancelled: 1 })
    expect(await t.run((ctx) => ctx.db.query('productionEvents').collect())).toHaveLength(0)
  })
})
