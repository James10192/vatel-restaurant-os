import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import { WEEK, createDish, setupCanteens as setup } from '../tests/convex-fixture'

describe('menus', () => {
  test('brouillon invisible pour les usagers, visible après publication', async () => {
    const { adminA, studentA } = await setup()
    const dishId = await createDish(adminA)
    await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 50 })

    expect(await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })).toHaveLength(0)
    expect(await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })).toEqual({ published: 1 })

    const week = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(week).toHaveLength(1)
    expect(week[0]).toMatchObject({ dishName: "Attiéké poisson", priceXof: 1500, remaining: 50 })
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
