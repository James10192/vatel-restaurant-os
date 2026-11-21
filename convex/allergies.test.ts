import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import { WEEK, setupCanteens } from '../tests/convex-fixture'

describe('allergies des usagers', () => {
  test('déclarées par la personne, alerte sur le plat ; allergène libre d’un ingrédient repris par le plat', async () => {
    const { adminA, studentA, studentA2 } = await setupCanteens()
    const unit = (await adminA.mutation(api.catalog.createUnit, { name: 'kg' }))._id
    const rice = (await adminA.mutation(api.catalog.createIngredient, { name: 'Riz' }))._id
    const sauce = (await adminA.mutation(api.catalog.createIngredient, { name: 'Sauce mangue' }))._id
    await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: rice, allergens: [] })
    await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: sauce, allergens: ['peanuts'], others: ['Mangue'] })
    const dishId = await adminA.mutation(api.dishes.save, {
      dish: {
        name: 'Riz mangue',
        defaultPriceXof: 1500,
        allergens: { status: 'unknown' },
        recipe: { portions: 10, lines: [{ ingredientId: rice, quantity: 1, unitId: unit }, { ingredientId: sauce, quantity: 1, unitId: unit }] },
      },
    })
    await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
    await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })

    const saved = await studentA.mutation(api.account.setMyAllergies, { codes: [], others: ['arachide', 'mangue'] })
    expect(saved).toEqual({ codes: ['peanuts'], others: ['mangue'] })
    expect(await studentA.query(api.account.myAllergies, {})).toEqual(saved)

    const [item] = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(item.allergens).toEqual({ status: 'declared', present: ['Arachides', 'Mangue'], traces: [] })
    expect(item.allergyAlert).toEqual({ matches: ['Arachides', 'mangue'], unknown: false })

    // Les allergies d'une personne ne touchent ni ne fuient vers une autre.
    const [other] = await studentA2.query(api.menus.publishedWeek, { weekStart: WEEK })
    expect(other.allergyAlert).toBeUndefined()
    expect(await studentA2.query(api.account.myAllergies, {})).toEqual({ codes: [], others: [] })
  }, 20_000)
})
