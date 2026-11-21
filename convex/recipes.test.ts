import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import { setupCanteens } from '../tests/convex-fixture'

type Admin = Awaited<ReturnType<typeof setupCanteens>>['adminA']

/** Fiche à deux ingrédients, dont on peut régler les allergènes. */
async function recipeKit(admin: Admin) {
  const unit = await admin.mutation(api.catalog.createUnit, { name: 'kg' })
  const fish = await admin.mutation(api.catalog.createIngredient, { name: 'Poisson' })
  const flour = await admin.mutation(api.catalog.createIngredient, { name: 'Farine' })
  const save = (lossPct?: number) =>
    admin.mutation(api.dishes.save, {
      dish: {
        name: 'Beignets de poisson',
        defaultPriceXof: 1500,
        allergens: { status: 'declared', present: [], traces: ['Sésame'] },
        recipe: {
          portions: 10,
          lines: [
            { ingredientId: fish._id, quantity: 2, unitId: unit._id, lossPct },
            { ingredientId: flour._id, quantity: 1, unitId: unit._id },
          ],
        },
      },
    })
  const dishOf = async (dishId: string) => (await admin.query(api.dishes.list, {})).find((d) => d._id === dishId)
  return { fish, flour, save, dishOf }
}

describe('fiches techniques et allergènes (#13)', () => {
  test('allergènes du plat déduits des ingrédients, traces manuelles conservées', async () => {
    const { adminA } = await setupCanteens()
    const { fish, flour, save, dishOf } = await recipeKit(adminA)
    await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: fish._id, allergens: ['fish'] })
    await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: flour._id, allergens: ['gluten', 'gluten'] })
    const dish = await dishOf(await save(30))
    expect(dish?.allergens).toEqual({ status: 'declared', present: ['Gluten', 'Poissons'], traces: ['Sésame'] })
    expect(dish?.recipe.lines[0].lossPct).toBe(30)
  })

  test('un seul ingrédient non renseigné : le plat reste « non renseigné » (jamais présenté comme sans allergène)', async () => {
    const { adminA } = await setupCanteens()
    const { fish, save, dishOf } = await recipeKit(adminA)
    await adminA.mutation(api.catalog.setIngredientAllergens, { ingredientId: fish._id, allergens: [] })
    expect((await dishOf(await save()))?.allergens).toEqual({ status: 'unknown' })
  })

  test('perte à la préparation bornée entre 0 et 99 %', async () => {
    const { adminA } = await setupCanteens()
    const { save } = await recipeKit(adminA)
    for (const lossPct of [-1, 100, 150]) await expect(save(lossPct)).rejects.toThrow(/Perte/)
    await expect(save(0)).resolves.toBeTruthy()
  })

  test('allergènes d’ingrédient : réservé à l’administration de l’établissement', async () => {
    const { adminA, adminB, studentA } = await setupCanteens()
    const { fish } = await recipeKit(adminA)
    await expect(studentA.mutation(api.catalog.setIngredientAllergens, { ingredientId: fish._id, allergens: ['fish'] })).rejects.toThrow()
    await expect(adminB.mutation(api.catalog.setIngredientAllergens, { ingredientId: fish._id, allergens: ['fish'] })).rejects.toThrow()
    const refs = await adminA.query(api.catalog.references, {})
    expect(refs.ingredients.find((i) => i._id === fish._id)?.allergens).toBeUndefined()
  })
})
