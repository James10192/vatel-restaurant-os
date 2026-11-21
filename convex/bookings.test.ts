import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

const history = async (user: Awaited<ReturnType<typeof setupCanteens>>['studentA']) =>
  (await user.query(api.wallet.history, { paginationOpts: { numItems: 50, cursor: null } })).page

describe('porte-monnaie de démonstration', () => {
  test('recharge idempotente : même clé = un seul crédit ; autre montant = refus', async () => {
    const { studentA } = await setupCanteens()
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 'k1' })
    const replay = await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 'k1' })
    expect(replay).toEqual({ balanceXof: 5000, replayed: true })
    await expect(studentA.mutation(api.wallet.topUpDemo, { amountXof: 9000, idempotencyKey: 'k1' })).rejects.toThrow(
      /autre montant/,
    )
    expect(await studentA.query(api.wallet.balance, {})).toBe(5000)
    expect(await history(studentA)).toHaveLength(1)
  })

  test('montants négatifs, décimaux ou au-delà du plafond refusés', async () => {
    const { studentA } = await setupCanteens()
    for (const [i, amountXof] of [-100, 0, 10.5, 50_001].entries()) {
      await expect(studentA.mutation(api.wallet.topUpDemo, { amountXof, idempotencyKey: `bad-${i}` })).rejects.toThrow(
        /Recharge/,
      )
    }
    expect(await studentA.query(api.wallet.balance, {})).toBe(0)
  })
})

describe('réservation', () => {
  test('débit, réservation et portion engagés ensemble ; prix figé lu en base', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't' })
    const result = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'b1' })
    expect(result).toMatchObject({ balanceXof: 500, replayed: false })
    const [booking] = await studentA.query(api.bookings.mine, { from: WEEK })
    expect(booking).toMatchObject({ status: 'confirmed', priceXof: 1500 })
    const [item] = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(item.remaining).toBe(49)
  })

  test('double clic (même clé) : un seul débit ; même clé pour un autre repas : conflit', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    const otherId = await publishedLunch(adminA, 10, 1000, '2026-11-24')
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    const [first, second] = await Promise.all([
      studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'same' }),
      studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'same' }),
    ])
    expect(second.bookingId).toBe(first.bookingId)
    expect(await studentA.query(api.wallet.balance, {})).toBe(3500)
    await expect(studentA.mutation(api.bookings.book, { menuItemId: otherId, idempotencyKey: 'same' })).rejects.toThrow(
      /autre repas/,
    )
  })

  test('solde insuffisant : aucune écriture partielle', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 1000, idempotencyKey: 't' })
    await expect(studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'b' })).rejects.toThrow(/insuffisant/)
    expect(await studentA.query(api.wallet.balance, {})).toBe(1000)
    expect(await studentA.query(api.bookings.mine, { from: WEEK })).toHaveLength(0)
  })

  test('dernière portion : un seul gagnant, pas de survente', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA, 1)
    for (const user of [studentA, studentA2]) {
      await user.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't' })
    }
    const results = await Promise.allSettled([
      studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'x' }),
      studentA2.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'y' }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const [item] = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(item.remaining).toBe(0)
  })

  test('un seul repas par service et par personne', async () => {
    const { adminA, studentA } = await setupCanteens()
    const first = await publishedLunch(adminA, 10)
    const second = await publishedLunch(adminA, 20)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    await studentA.mutation(api.bookings.book, { menuItemId: first, idempotencyKey: 'a' })
    await expect(studentA.mutation(api.bookings.book, { menuItemId: second, idempotencyKey: 'b' })).rejects.toThrow(
      /déjà un repas/,
    )
  })

  test('après l’échéance : réservation refusée', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'))
    await expect(studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'b' })).rejects.toThrow(/closes/)
  })
})

describe('annulation', () => {
  test('remboursement unique ; deuxième annulation refusée', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't' })
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'b' })
    expect(await studentA.mutation(api.bookings.cancel, { bookingId })).toEqual({ balanceXof: 2000 })
    await expect(studentA.mutation(api.bookings.cancel, { bookingId })).rejects.toThrow(/ne peut plus/)
    expect(await studentA.query(api.wallet.balance, {})).toBe(2000)
    expect((await history(studentA)).map((e) => e.kind)).toEqual(['booking_refund', 'booking_debit', 'demo_top_up'])
    const [item] = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(item.remaining).toBe(50)
  })

  test('après l’échéance ou par un autre usager : refusée', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't' })
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'b' })
    await expect(studentA2.mutation(api.bookings.cancel, { bookingId })).rejects.toThrow(/introuvable/)
    vi.setSystemTime(new Date('2026-11-23T11:00:00Z'))
    await expect(studentA.mutation(api.bookings.cancel, { bookingId })).rejects.toThrow(/Délai/)
  })

  test('la capacité ne peut pas descendre sous les portions réservées', async () => {
    const { adminA, studentA } = await setupCanteens()
    const itemId = await publishedLunch(adminA, 5)
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 2000, idempotencyKey: 't' })
    await studentA.mutation(api.bookings.book, { menuItemId: itemId, idempotencyKey: 'b' })
    await expect(adminA.mutation(api.menus.updateItem, { itemId, priceXof: 1500, capacity: 0 })).rejects.toThrow(
      /capacité trop basse/,
    )
  })
})
