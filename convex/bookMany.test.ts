import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

/** Trois déjeuners publiés (lundi à mercredi, 1 500 FCFA chacun) ; Awa a `topUp` FCFA. */
async function week(topUp: number, capacities: Array<number> = [10, 10, 10]) {
  const fixture = await setupCanteens()
  const { adminA, studentA } = fixture
  const ids = []
  for (const [i, capacity] of capacities.entries()) ids.push(await publishedLunch(adminA, capacity, 1500, addDays(WEEK, i)))
  await studentA.mutation(api.wallet.topUpDemo, { amountXof: topUp, idempotencyKey: 't' })
  const state = async () => ({
    balance: await studentA.query(api.wallet.balance, {}),
    bookings: (await studentA.query(api.bookings.mine, { from: WEEK })).filter((b) => b.status === 'confirmed').length,
  })
  return { ...fixture, ids, state }
}

describe('réservation groupée', () => {
  test('nominal : trois repas, trois débits, une seule confirmation', async () => {
    const { studentA, ids, state } = await week(5000)
    const result = await studentA.mutation(api.bookings.bookMany, { menuItemIds: ids, idempotencyKey: 'lot' })
    expect(result).toMatchObject({ balanceXof: 500, replayed: false })
    expect(result.bookingIds).toHaveLength(3)
    expect(await state()).toEqual({ balance: 500, bookings: 3 })
  })

  test('tout ou rien : solde insuffisant pour le dernier repas, rien n’est réservé ni débité', async () => {
    const { studentA, ids, state } = await week(4000)
    await expect(studentA.mutation(api.bookings.bookMany, { menuItemIds: ids, idempotencyKey: 'lot' })).rejects.toThrow(
      `Repas du ${addDays(WEEK, 2)} : Solde insuffisant`,
    )
    expect(await state()).toEqual({ balance: 4000, bookings: 0 })
  })

  test('tout ou rien : un repas devenu complet bloque le lot et il est nommé', async () => {
    const { studentA, studentA2, ids, state } = await week(5000, [10, 1, 10])
    await studentA2.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't2' })
    await studentA2.mutation(api.bookings.book, { menuItemId: ids[1], idempotencyKey: 'last' })
    await expect(studentA.mutation(api.bookings.bookMany, { menuItemIds: ids, idempotencyKey: 'lot' })).rejects.toThrow(
      `Repas du ${addDays(WEEK, 1)} : Plus de portions`,
    )
    expect(await state()).toEqual({ balance: 5000, bookings: 0 })
  })

  test('idempotence : renvoi identique sans double débit ; même clé, autres repas refusés', async () => {
    const { studentA, ids, state } = await week(5000)
    const first = await studentA.mutation(api.bookings.bookMany, { menuItemIds: ids.slice(0, 2), idempotencyKey: 'lot' })
    const again = await studentA.mutation(api.bookings.bookMany, { menuItemIds: ids.slice(0, 2), idempotencyKey: 'lot' })
    expect(again).toEqual({ ...first, replayed: true })
    await expect(studentA.mutation(api.bookings.bookMany, { menuItemIds: [ids[2]], idempotencyKey: 'lot' })).rejects.toThrow(/autres repas/)
    expect(await state()).toEqual({ balance: 2000, bookings: 2 })
  })

  test('entrées refusées : vide, doublon, plus de 7, repas d’un autre établissement, service déjà réservé', async () => {
    const { studentA, adminB, ids } = await week(9000)
    const lot = (menuItemIds: typeof ids, key = 'x') => studentA.mutation(api.bookings.bookMany, { menuItemIds, idempotencyKey: key })
    await expect(lot([])).rejects.toThrow(/Entre 1 et 7/)
    await expect(lot([ids[0], ids[0]])).rejects.toThrow(/deux fois/)
    await expect(lot(Array.from({ length: 8 }, () => ids[0]))).rejects.toThrow(/Entre 1 et 7/)
    const foreign = await publishedLunch(adminB, 5)
    await expect(lot([ids[0], foreign], 'y')).rejects.toThrow(/introuvable/)
    await studentA.mutation(api.bookings.book, { menuItemId: ids[0], idempotencyKey: 'solo' })
    await expect(lot([ids[0], ids[1]], 'z')).rejects.toThrow(`Repas du ${WEEK} : Vous avez déjà un repas`)
  })
})
