import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'
import { DEFAULT_POLICY } from './lib/policy'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

type Fixture = Awaited<ReturnType<typeof setupCanteens>>
const withPolicy = (admin: Fixture['adminA'], extra: Partial<typeof DEFAULT_POLICY>) => admin.mutation(api.settings.updatePolicy, { policy: { ...DEFAULT_POLICY, ...extra } })
async function funded(fixture: Fixture) {
  for (const [user, key] of [[fixture.studentA, 'a'], [fixture.studentA2, 'b'], [fixture.studentA3, 'c']] as const) {
    await user.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: `t${key}` })
  }
}

describe('créneaux et capacité de service', () => {
  test('attribution, créneau choisi, changement avant clôture, refus quand tout est plein', async () => {
    const fixture = await setupCanteens()
    const { adminA, studentA, studentA2, studentA3 } = fixture
    await funded(fixture)
    await withPolicy(adminA, { slots: { durationMinutes: 30, slotMinutes: 15, slotCapacity: 1 } })
    const a = await publishedLunch(adminA, 10)
    const b = await publishedLunch(adminA, 10, 1500, WEEK)
    await studentA.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'x', slot: '12:15' })
    expect((await studentA.query(api.bookings.mine, { from: WEEK }))[0].slot).toBe('12:15')
    await studentA2.mutation(api.bookings.book, { menuItemId: b, idempotencyKey: 'y' })
    expect((await studentA2.query(api.bookings.mine, { from: WEEK }))[0].slot).toBe('12:00')
    expect(await studentA3.query(api.bookings.slotsFor, { menuItemId: a })).toEqual([
      { slot: '12:00', remaining: 0 },
      { slot: '12:15', remaining: 0 },
    ])
    await expect(studentA3.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'z' })).rejects.toThrow(/créneaux de retrait sont complets/)
    // Créneau choisi plein : refusé, jamais remplacé en silence.
    await expect(studentA3.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'w', slot: '12:15' })).rejects.toThrow(/Ce créneau est complet/)
    const [mine] = await studentA.query(api.bookings.mine, { from: WEEK })
    await expect(studentA.mutation(api.bookings.changeSlot, { bookingId: mine._id, slot: '12:00' })).rejects.toThrow(/complet/)
    await expect(studentA.mutation(api.bookings.changeSlot, { bookingId: mine._id, slot: '13:00' })).rejects.toThrow(/inconnu/)
    await expect(studentA2.mutation(api.bookings.changeSlot, { bookingId: mine._id, slot: '12:00' })).rejects.toThrow(/introuvable/)
    const flow = await adminA.query(api.counter.slotFlow, { date: WEEK })
    expect(flow.filter((f) => f.service === 'lunch').map((f) => [f.slot, f.booked])).toEqual([['12:00', 1], ['12:15', 1]])
  })

  test('capacité globale du service, tous plats confondus', async () => {
    const fixture = await setupCanteens()
    const { adminA, studentA, studentA2 } = fixture
    await funded(fixture)
    await withPolicy(adminA, { serviceCapacity: { lunch: 1, dinner: 10 } })
    const a = await publishedLunch(adminA, 10)
    const b = await publishedLunch(adminA, 10, 1500, WEEK)
    await studentA.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'x' })
    await expect(studentA2.mutation(api.bookings.book, { menuItemId: b, idempotencyKey: 'y' })).rejects.toThrow(/Service complet/)
  })

  test('réglages : validation complète, administration seulement', async () => {
    const { adminA, studentA } = await setupCanteens()
    await expect(withPolicy(adminA, { serviceStart: { lunch: '25:00', dinner: '19:00' } })).rejects.toThrow(/HH:MM/)
    await expect(withPolicy(adminA, { slots: { durationMinutes: 60, slotMinutes: 2, slotCapacity: 5 } })).rejects.toThrow(/créneau/)
    await expect(withPolicy(adminA, { serviceCapacity: { lunch: 0, dinner: 5 } })).rejects.toThrow(/Capacité/)
    await expect(withPolicy(studentA, {})).rejects.toThrow(/administration/)
    await withPolicy(adminA, { cutoffMinutes: 30 })
    expect((await adminA.query(api.settings.policy, {})).cutoffMinutes).toBe(30)
  })
})

describe('liste d’attente', () => {
  test('inscription seulement si complet ; annulation : le plus ancien inscrit est prévenu ; réserver retire de la liste', async () => {
    const fixture = await setupCanteens()
    const { adminA, studentA, studentA2, studentA3, t } = fixture
    await funded(fixture)
    const a = await publishedLunch(adminA, 1)
    await expect(studentA2.mutation(api.waitlist.join, { menuItemId: a })).rejects.toThrow(/encore disponibles/)
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'x' })
    await studentA2.mutation(api.waitlist.join, { menuItemId: a })
    await studentA2.mutation(api.waitlist.join, { menuItemId: a })
    await studentA3.mutation(api.waitlist.join, { menuItemId: a })
    expect(await studentA2.query(api.waitlist.mine, {})).toEqual([a])
    await studentA.mutation(api.bookings.cancel, { bookingId })
    // Le plus ancien (A2) est prévenu puis retiré ; A3 attend toujours.
    expect(await studentA2.query(api.waitlist.mine, {})).toEqual([])
    expect(await studentA3.query(api.waitlist.mine, {})).toEqual([a])
    await studentA2.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'y' })
    await studentA3.mutation(api.waitlist.leave, { menuItemId: a })
    expect(await t.run((ctx) => ctx.db.query('waitlist').collect())).toEqual([])
  })

  test('service complet (capacité globale) : inscription possible même si le plat a de la place', async () => {
    const fixture = await setupCanteens()
    const { adminA, studentA, studentA2 } = fixture
    await funded(fixture)
    await withPolicy(adminA, { serviceCapacity: { lunch: 1, dinner: 10 } })
    const a = await publishedLunch(adminA, 10)
    const b = await publishedLunch(adminA, 10, 1500, WEEK)
    const { bookingId } = await studentA.mutation(api.bookings.book, { menuItemId: a, idempotencyKey: 'x' })
    await studentA2.mutation(api.waitlist.join, { menuItemId: b })
    await studentA.mutation(api.bookings.cancel, { bookingId })
    expect(await studentA2.query(api.waitlist.mine, {})).toEqual([])
  })
})
