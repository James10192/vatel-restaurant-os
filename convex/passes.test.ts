import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'
import { formatCode, generateCode, hashCode, normalizeCode } from './lib/pass'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

/** Awa a réservé le déjeuner du jour de référence ; un agent de distribution et un chef existent dans A. */
async function scenario() {
  const fixture = await setupCanteens()
  const { t, ids, adminA, studentA } = fixture
  await t.run(async (ctx) => {
    await ctx.db.insert('profiles', { authUserId: 'dist-a', canteenId: ids.a, role: 'distribution', displayName: 'Agent A' })
    await ctx.db.insert('profiles', { authUserId: 'chef-a', canteenId: ids.a, role: 'chef' })
  })
  const menuItemId = await publishedLunch(adminA, 10)
  await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
  const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k1' })
  return { ...fixture, bookingId, distA: t.withIdentity({ subject: 'dist-a' }), chefA: t.withIdentity({ subject: 'chef-a' }) }
}

describe('code de pass', () => {
  test('12 caractères, saisie tolérante, empreinte stable', async () => {
    const code = generateCode()
    expect(normalizeCode(code)).toBe(code)
    expect(normalizeCode(formatCode(code).toLowerCase())).toBe(code)
    expect(normalizeCode('abcd efgh ijkl')).toBe('ABCDEFGH1JK1')
    expect(normalizeCode('ABCD-EFGH-JKMU')).toBeNull()
    expect(normalizeCode('ABC')).toBeNull()
    expect(await hashCode(code)).toHaveLength(64)
    expect(new Set(Array.from({ length: 200 }, generateCode)).size).toBe(200)
  })
})

describe('QR de retrait', () => {
  test('aperçu puis remise unique ; le second scan est refusé', async () => {
    const { studentA, distA, bookingId, t } = await scenario()
    const { code } = await studentA.mutation(api.passes.issue, { bookingId })
    expect(await t.run((ctx) => ctx.db.query('bookingPasses').collect())).not.toContainEqual(expect.objectContaining({ codeHash: code }))
    const preview = await distA.query(api.passes.inspect, { code: formatCode(code) })
    expect(preview).toMatchObject({ verdict: 'ready', meal: { diner: 'Nom student-a', date: WEEK, usedAt: null } })
    expect(await distA.mutation(api.passes.redeem, { code })).toEqual({ dishName: `Plat ${WEEK} 10` })
    await expect(distA.mutation(api.passes.redeem, { code })).rejects.toThrow(/déjà remis/)
    expect((await distA.query(api.passes.inspect, { code })).verdict).toBe('used')
    const [booking] = await studentA.query(api.bookings.mine, { from: WEEK })
    expect(booking.status).toBe('picked_up')
  })

  test('réémission : l’ancien code ne vaut plus rien', async () => {
    const { studentA, distA, bookingId } = await scenario()
    const first = await studentA.mutation(api.passes.issue, { bookingId })
    const second = await studentA.mutation(api.passes.issue, { bookingId })
    expect((await distA.query(api.passes.inspect, { code: first.code })).verdict).toBe('unknown')
    expect((await distA.query(api.passes.inspect, { code: second.code })).verdict).toBe('ready')
  })

  test('annulée ou illisible : refus avec motif', async () => {
    const { studentA, distA, bookingId } = await scenario()
    const { code } = await studentA.mutation(api.passes.issue, { bookingId })
    await studentA.mutation(api.bookings.cancel, { bookingId })
    expect((await distA.query(api.passes.inspect, { code })).verdict).toBe('cancelled')
    await expect(distA.mutation(api.passes.redeem, { code })).rejects.toThrow(/annulée/)
    expect(await distA.query(api.passes.inspect, { code: '<script>' })).toEqual({ verdict: 'invalid', meal: null })
  })

  test('repas du lendemain : refusé aujourd’hui, expiré le surlendemain', async () => {
    const { adminA, studentA, distA } = await scenario()
    const tomorrow = await publishedLunch(adminA, 5, 1500, addDays(WEEK, 1))
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId: tomorrow, idempotencyKey: 'k2' })
    const { code } = await studentA.mutation(api.passes.issue, { bookingId })
    expect((await distA.query(api.passes.inspect, { code })).verdict).toBe('wrong_day')
    await expect(distA.mutation(api.passes.redeem, { code })).rejects.toThrow(/autre jour/)
    vi.setSystemTime(new Date(`${addDays(WEEK, 2)}T10:00:00Z`))
    expect((await distA.query(api.passes.inspect, { code })).verdict).toBe('expired')
  })

  test('remise manuelle déjà faite : le QR est refusé (pas de double remise)', async () => {
    const { studentA, adminA, distA, bookingId } = await scenario()
    const { code } = await studentA.mutation(api.passes.issue, { bookingId })
    await adminA.mutation(api.admin.markPickedUp, { bookingId })
    await expect(distA.mutation(api.passes.redeem, { code })).rejects.toThrow(/déjà remis/)
  })

  test('droits : autre usager, autre établissement, usager et chef refusés', async () => {
    const { studentA, studentA2, adminB, chefA, bookingId } = await scenario()
    await expect(studentA2.mutation(api.passes.issue, { bookingId })).rejects.toThrow(/introuvable/)
    const { code } = await studentA.mutation(api.passes.issue, { bookingId })
    expect(await adminB.query(api.passes.inspect, { code })).toEqual({ verdict: 'unknown', meal: null })
    await expect(adminB.mutation(api.passes.redeem, { code })).rejects.toThrow(/inconnu/)
    await expect(studentA.query(api.passes.inspect, { code })).rejects.toThrow(/distribution/)
    await expect(chefA.mutation(api.passes.redeem, { code })).rejects.toThrow(/distribution/)
  })

  test('aucun pass pour un repas annulé ou passé', async () => {
    const { studentA, bookingId } = await scenario()
    vi.setSystemTime(new Date(`${addDays(WEEK, 1)}T10:00:00Z`))
    await expect(studentA.mutation(api.passes.issue, { bookingId })).rejects.toThrow(/passé/)
    vi.setSystemTime(BEFORE_CUTOFF)
    await studentA.mutation(api.bookings.cancel, { bookingId })
    await expect(studentA.mutation(api.passes.issue, { bookingId })).rejects.toThrow(/confirmée/)
  })
})
