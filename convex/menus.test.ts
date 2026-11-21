/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const WEEK = '2026-11-23' // lundi

type Role = 'admin' | 'student'

async function setup() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const a = await ctx.db.insert('canteens', { name: 'Cantine A', slug: 'a' })
    const b = await ctx.db.insert('canteens', { name: 'Cantine B', slug: 'b' })
    const members: Array<[string, typeof a, Role]> = [
      ['admin-a', a, 'admin'],
      ['student-a', a, 'student'],
      ['admin-b', b, 'admin'],
    ]
    for (const [authUserId, canteenId, role] of members) {
      await ctx.db.insert('profiles', { authUserId, canteenId, role })
    }
    return { a, b }
  })
  const as = (subject: string) => t.withIdentity({ subject })
  return { t, ids, adminA: as('admin-a'), studentA: as('student-a'), adminB: as('admin-b'), stranger: as('nobody') }
}

async function createDish(user: Awaited<ReturnType<typeof setup>>['adminA'], name = 'Attiéké poisson') {
  return await user.mutation(api.dishes.save, {
    dish: {
      name,
      defaultPriceXof: 1500,
      allergens: { status: 'declared', present: ['Poisson'], traces: [] },
      recipe: { portions: 1, lines: [] },
    },
  })
}

describe('menus', () => {
  test('brouillon invisible pour les usagers, visible après publication', async () => {
    const { adminA, studentA } = await setup()
    const dishId = await createDish(adminA)
    await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 50 })

    expect(await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })).toHaveLength(0)
    expect(await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })).toEqual({ published: 1 })

    const week = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(week).toHaveLength(1)
    expect(week[0]).toMatchObject({ dishName: 'Attiéké poisson', priceXof: 1500, capacity: 50 })
    expect(week[0]).not.toHaveProperty('recipe')
  })

  test('un usager ne peut ni créer de plat ni publier', async () => {
    const { adminA, studentA } = await setup()
    await createDish(adminA)
    await expect(createDish(studentA)).rejects.toThrow(/administration/)
    await expect(studentA.mutation(api.menus.publishWeek, { weekStart: WEEK })).rejects.toThrow(/administration/)
  })

  test('compte non rattaché : aucun accès', async () => {
    const { stranger } = await setup()
    await expect(stranger.query(api.menus.publishedWeek, { weekStart: WEEK })).rejects.toThrow(/non rattaché/)
  })

  test('isolation des établissements : un admin B ne voit ni ne programme un plat de A', async () => {
    const { adminA, adminB } = await setup()
    const dishId = await createDish(adminA)
    await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
    expect(await adminB.query(api.menus.adminWeek, { weekStart: WEEK })).toHaveLength(0)
    await expect(
      adminB.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 }),
    ).rejects.toThrow(/introuvable/)
  })

  test('prix : entier positif en FCFA obligatoire', async () => {
    const { adminA } = await setup()
    const dishId = await createDish(adminA)
    const itemId = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
    for (const priceXof of [0, -100, 1500.5]) {
      await expect(adminA.mutation(api.menus.updateItem, { itemId, priceXof, capacity: 10 })).rejects.toThrow(/Prix/)
    }
  })

  test('un plat publié ne peut pas être retiré', async () => {
    const { adminA } = await setup()
    const dishId = await createDish(adminA)
    const itemId = await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })
    await expect(adminA.mutation(api.menus.removeItem, { itemId })).rejects.toThrow(/publié/)
  })
})

describe('références créées au point d’usage', () => {
  test('même nom (casse et accents ignorés) : pas de doublon, élément existant renvoyé', async () => {
    const { adminA } = await setup()
    const first = await adminA.mutation(api.catalog.createUnit, { name: 'Sac' })
    const again = await adminA.mutation(api.catalog.createUnit, { name: '  sac ' })
    expect(first.created).toBe(true)
    expect(again).toEqual({ _id: first._id, name: 'Sac', created: false })
  })

  test('une recette ne peut pas référencer l’unité d’un autre établissement', async () => {
    const { adminA, adminB } = await setup()
    const unit = await adminB.mutation(api.catalog.createUnit, { name: 'kg' })
    const ingredient = await adminA.mutation(api.catalog.createIngredient, { name: 'Riz' })
    await expect(
      adminA.mutation(api.dishes.save, {
        dish: {
          name: 'Riz gras',
          defaultPriceXof: 1000,
          allergens: { status: 'unknown' },
          recipe: { portions: 10, lines: [{ ingredientId: ingredient._id, quantity: 0.8, unitId: unit._id }] },
        },
      }),
    ).rejects.toThrow(/introuvable/)
  })
})
