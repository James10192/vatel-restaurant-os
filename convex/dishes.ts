import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin } from './lib/access'
import { assertPositive, assertPriceXof, cleanName } from './lib/validation'
import { allergenInfoValidator, recipeLineValidator } from './schema'

const dishInput = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  defaultPriceXof: v.number(),
  allergens: allergenInfoValidator,
  recipe: v.object({ portions: v.number(), lines: v.array(recipeLineValidator) }),
})

/** Catalogue des plats de l'établissement (administration). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { canteenId } = await requireAdmin(ctx)
    const dishes = await ctx.db.query('dishes').withIndex('by_canteen', (q) => q.eq('canteenId', canteenId)).collect()
    return dishes.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  },
})

/** Crée ou met à jour un plat et sa fiche recette, après contrôle de chaque référence. */
export const save = mutation({
  args: { dishId: v.optional(v.id('dishes')), dish: dishInput },
  returns: v.id('dishes'),
  handler: async (ctx, { dishId, dish }) => {
    const membership = await requireAdmin(ctx)
    const { name } = cleanName(dish.name, 'Nom du plat')
    assertPriceXof(dish.defaultPriceXof)
    if (!Number.isInteger(dish.recipe.portions) || dish.recipe.portions < 1) {
      throw new ConvexError('Portions de référence : entier supérieur ou égal à 1.')
    }
    for (const line of dish.recipe.lines) {
      assertPositive(line.quantity, 'Quantité')
      await getOwned(ctx, membership, line.ingredientId)
      await getOwned(ctx, membership, line.unitId)
    }
    const allergens =
      dish.allergens.status === 'unknown'
        ? dish.allergens
        : {
            status: 'declared' as const,
            present: [...new Set(dish.allergens.present.map((a) => a.trim()).filter(Boolean))],
            traces: [...new Set(dish.allergens.traces.map((a) => a.trim()).filter(Boolean))],
          }
    const doc = {
      canteenId: membership.canteenId,
      name,
      description: dish.description?.trim() || undefined,
      defaultPriceXof: dish.defaultPriceXof,
      allergens,
      recipe: dish.recipe,
    }
    if (!dishId) return await ctx.db.insert('dishes', doc)
    await getOwned(ctx, membership, dishId)
    await ctx.db.replace(dishId, doc)
    return dishId
  },
})
