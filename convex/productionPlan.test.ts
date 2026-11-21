import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, createDish, setupCanteens } from '../tests/convex-fixture'
import { addDays } from './lib/dates'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

describe('plan de production', () => {
  test('validation tracée : la dernière fait foi, les corrections restent, écart mesurable', async () => {
    const { adminA, studentA } = await setupCanteens()
    const dishId = await createDish(adminA, 'Garba')
    const menuItemId = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 20 })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    await adminA.mutation(api.productionPlan.validatePlan, { menuItemId, walkIns: 5, margin: 2, idempotencyKey: 'a' })
    await adminA.mutation(api.productionPlan.validatePlan, { menuItemId, walkIns: 5, margin: 2, idempotencyKey: 'a' })
    await studentA.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: 't' })
    await studentA.mutation(api.bookings.book, { menuItemId, idempotencyKey: 'k' })
    await adminA.mutation(api.productionPlan.validatePlan, { menuItemId, walkIns: 3, margin: 1, idempotencyKey: 'b' })
    const [offer] = (await adminA.query(api.production.day, { date: WEEK })).offers
    expect(offer.plan).toMatchObject({ walkIns: 3, margin: 1, bookedAtValidation: 1, revisions: 2, by: 'Nom admin-a' })
  })

  test('entrées invalides, service passé, autre établissement, usager : refusés', async () => {
    const { adminA, adminB, studentA } = await setupCanteens()
    const dishId = await createDish(adminA, 'Garba')
    const today = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 20 })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    const plan = (walkIns: number, margin: number, key: string) => adminA.mutation(api.productionPlan.validatePlan, { menuItemId: today, walkIns, margin, idempotencyKey: key })
    await expect(plan(-1, 0, 'x')).rejects.toThrow(/entier entre 0/)
    await expect(plan(0, 1.5, 'y')).rejects.toThrow(/entier entre 0/)
    await expect(adminB.mutation(api.productionPlan.validatePlan, { menuItemId: today, walkIns: 0, margin: 0, idempotencyKey: 'z' })).rejects.toThrow(/introuvable/)
    await expect(studentA.query(api.productionPlan.dishHistory, { menuItemId: today })).rejects.toThrow(/cuisine/)
    vi.setSystemTime(new Date(`${addDays(WEEK, 1)}T08:00:00Z`))
    await expect(plan(1, 1, 'w')).rejects.toThrow(/passé/)
  })

  test('historique du plat : services passés seulement, absences comptées, semaine complète', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    const dishId = await createDish(adminA, 'Garba')
    const monday = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 20 })
    const tuesday = await adminA.mutation(api.menus.addItem, { date: addDays(WEEK, 1), service: 'lunch', dishId, capacity: 20 })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    for (const [user, key] of [[studentA, 'a'], [studentA2, 'b']] as const) {
      await user.mutation(api.wallet.topUpDemo, { amountXof: 5000, idempotencyKey: `t${key}` })
      await user.mutation(api.bookings.book, { menuItemId: monday, idempotencyKey: key })
    }
    const [awa] = await studentA.query(api.bookings.mine, { from: WEEK })
    await adminA.mutation(api.admin.markPickedUp, { bookingId: awa._id })
    vi.setSystemTime(new Date(`${addDays(WEEK, 1)}T08:00:00Z`))
    const result = await adminA.query(api.productionPlan.dishHistory, { menuItemId: tuesday })
    expect(result.services).toEqual([{ date: WEEK, booked: 2, pickedUp: 1, noShow: 1, cancelled: 0, prepared: null, wasted: 0 }])
    expect(result.suggestion.coldStart).toBe(true)
    const week = await adminA.query(api.productionPlan.week, { weekStart: addDays(WEEK, 2) })
    expect(week.map((d) => d.offers.length)).toEqual([1, 1, 0, 0, 0, 0, 0])
    expect(week[0].offers[0].noShow).toBe(1)
  })
})
