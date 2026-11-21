import { expect, test } from 'vitest'
import { api } from './_generated/api'
import { WEEK, setupCanteens } from '../tests/convex-fixture'

test('plat publié à fiche vide : on complète sa composition (nom et prix figés), une seule fois', async () => {
  const { adminA, studentA } = await setupCanteens()
  const empty = { name: 'Garba', defaultPriceXof: 1000, allergens: { status: 'unknown' as const }, recipe: { portions: 1, lines: [] } }
  const dishId = await adminA.mutation(api.dishes.save, { dish: empty })
  await adminA.mutation(api.menus.addItem, { date: WEEK, service: 'lunch', dishId, capacity: 10 })
  await adminA.mutation(api.menus.publishWeek, { weekStart: WEEK })

  const unit = (await adminA.mutation(api.catalog.createUnit, { name: 'kg' }))._id
  const tuna = (await adminA.mutation(api.catalog.createIngredient, { name: 'Thon' }))._id
  await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: tuna, allergens: ['fish'] })
  const recipe = { portions: 10, lines: [{ ingredientId: tuna, quantity: 1.5, unitId: unit, lossPct: 20 }] }

  await expect(adminA.mutation(api.dishes.save, { dishId, dish: { ...empty, defaultPriceXof: 1500, recipe } })).rejects.toThrow(/gardez son nom/)
  await adminA.mutation(api.dishes.save, { dishId, dish: { ...empty, recipe } })
  const [item] = await studentA.query(api.menus.publishedWeek, { weekStart: WEEK })
  expect(item.allergens).toEqual({ status: 'declared', present: ['Poissons'], traces: [] })

  // Complétée, la fiche redevient verrouillée.
  await expect(adminA.mutation(api.dishes.save, { dishId, dish: { ...empty, recipe: { ...recipe, portions: 5 } } })).rejects.toThrow(/déjà publié/)
})
