import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, setupCanteens } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => vi.useRealTimers())

type Admin = Awaited<ReturnType<typeof setupCanteens>>['adminA']

/** Riz (g dans la fiche, kg en stock) : 80 g par portion ; un déjeuner de 20 places publié aujourd'hui. */
async function kitchen(admin: Admin) {
  const g = await admin.mutation(api.catalog.createUnit, { name: 'g' })
  const kg = await admin.mutation(api.catalog.createUnit, { name: 'kg' })
  const rice = await admin.mutation(api.catalog.createIngredient, { name: 'Riz' })
  const dishId = await admin.mutation(api.dishes.save, {
    dish: { name: 'Riz gras', defaultPriceXof: 1000, allergens: { status: 'declared', present: [], traces: [] }, recipe: { portions: 10, lines: [{ ingredientId: rice._id, quantity: 800, unitId: g._id }] } },
  })
  const menuItemId = await admin.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 20 })
  await admin.mutation(api.menus.publishWeek, { weekStart: WEEK })
  return { g, kg, rice, menuItemId }
}

describe('stocks', () => {
  test('réception, consommation déduite du préparé, besoin, inventaire avec écart conservé', async () => {
    const { adminA, studentA } = await setupCanteens()
    const { kg, rice, menuItemId } = await kitchen(adminA)
    await adminA.mutation(api.stock.receive, { ingredientId: rice._id, quantity: 5, unitId: kg._id, lotCode: 'L1', expiresOn: '2026-11-25', supplier: 'Grossiste', unitCostXof: 700, idempotencyKey: 'r1' })
    await adminA.mutation(api.stock.receive, { ingredientId: rice._id, quantity: 5, unitId: kg._id, idempotencyKey: 'r1' })
    await adminA.mutation(api.productionPlan.validatePlan, { menuItemId, walkIns: 0, margin: 20, idempotencyKey: 'p' })
    await adminA.mutation(api.production.recordPrepared, { menuItemId, portions: 10, idempotencyKey: 'prep' })
    const [row] = await adminA.query(api.stock.overview, {})
    expect(row).toMatchObject({ name: 'Riz', unit: 'kg', theoretical: 4.2, need: 0.8, lastSupplier: 'Grossiste', lastUnitCostXof: 700, usedIn: ['Riz gras'] })
    expect(row.lots).toEqual([{ lotCode: 'L1', expiresOn: '2026-11-25', remaining: 4.2 }])
    const { expectedBefore } = await adminA.mutation(api.stock.count, { ingredientId: rice._id, quantity: 4, unitId: kg._id, idempotencyKey: 'c1' })
    expect(expectedBefore).toBeCloseTo(4.2)
    expect((await adminA.query(api.stock.overview, {}))[0]).toMatchObject({ theoretical: 4, lastCount: { quantity: 4 } })
    await adminA.mutation(api.stock.lose, { ingredientId: rice._id, quantity: 500, unitId: (await adminA.mutation(api.catalog.createUnit, { name: 'g' }))._id, reason: 'damaged', idempotencyKey: 'l1' })
    expect((await adminA.query(api.stock.overview, {}))[0].theoretical).toBeCloseTo(3.5)
    expect((await adminA.query(api.stock.recent, {})).map((m) => m.kind)).toEqual(['loss', 'count', 'reception'])
    await expect(studentA.query(api.stock.overview, {})).rejects.toThrow(/cuisine/)
  })

  test('préparation antérieure à la première réception : ne consomme pas ce stock', async () => {
    const { adminA } = await setupCanteens()
    const { kg, rice, menuItemId } = await kitchen(adminA)
    await adminA.mutation(api.production.recordPrepared, { menuItemId, portions: 10, idempotencyKey: 'avant' })
    await adminA.mutation(api.stock.receive, { ingredientId: rice._id, quantity: 5, unitId: kg._id, idempotencyKey: 'r' })
    expect((await adminA.query(api.stock.overview, {}))[0].theoretical).toBe(5)
  })

  test('entrées invalides et autre établissement refusés', async () => {
    const { adminA, adminB } = await setupCanteens()
    const { kg, rice } = await kitchen(adminA)
    const receive = (over: Record<string, unknown>) =>
      adminA.mutation(api.stock.receive, { ingredientId: rice._id, quantity: 1, unitId: kg._id, idempotencyKey: String(Math.random()), ...over })
    await expect(receive({ quantity: 0 })).rejects.toThrow(/Quantité invalide/)
    await expect(receive({ quantity: -2 })).rejects.toThrow(/Quantité invalide/)
    await expect(receive({ expiresOn: '2026-02-31' })).rejects.toThrow(/Date limite/)
    await expect(receive({ unitCostXof: 12.5 })).rejects.toThrow(/Prix unitaire/)
    await expect(adminB.mutation(api.stock.receive, { ingredientId: rice._id, quantity: 1, unitId: kg._id, idempotencyKey: 'x' })).rejects.toThrow(/introuvable/)
    expect(await adminB.query(api.stock.overview, {})).toEqual([])
  })
})

describe('surplus récupéré', () => {
  test('contrôle hygiène obligatoire ; compté à part des pertes ; même plafond', async () => {
    const { adminA } = await setupCanteens()
    const { menuItemId } = await kitchen(adminA)
    await adminA.mutation(api.production.recordPrepared, { menuItemId, portions: 5, idempotencyKey: 'p' })
    const recover = (portions: number, hygieneChecked: boolean, key: string) => adminA.mutation(api.production.recordRecovered, { menuItemId, portions, hygieneChecked, idempotencyKey: key })
    await expect(recover(2, false, 'a')).rejects.toThrow(/hygiène/)
    await recover(2, true, 'b')
    await adminA.mutation(api.production.recordWaste, { menuItemId, portions: 2, reason: 'kitchen', idempotencyKey: 'w' })
    await expect(recover(2, true, 'c')).rejects.toThrow(/Au plus 1 portions/)
    const [offer] = (await adminA.query(api.production.day, { date: WEEK })).offers
    expect(offer).toMatchObject({ prepared: 5, recovered: 2, waste: { kitchen: 2 } })
    // Correction sous ce qui est déjà sorti (2 récupérées + 2 perdues) : refusée.
    await expect(adminA.mutation(api.production.recordPrepared, { menuItemId, portions: -2, idempotencyKey: 'c' })).rejects.toThrow(/déjà servies ou déclarées/)
  })
})
