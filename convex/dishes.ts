import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin } from './lib/access'
import { assertListLength, assertPositive, assertPriceXof, assertText, cleanName } from './lib/validation'
import { allergenInfoValidator, recipeLineValidator } from './schema'
import { dishListReturns } from './lib/returns'

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
  returns: dishListReturns,
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
            present: [...new Set(assertListLength(dish.allergens.present, 'Allergènes').map((a) => a.trim()).filter(Boolean))],
            traces: [...new Set(assertListLength(dish.allergens.traces, 'Traces').map((a) => a.trim()).filter(Boolean))],
          }
    const doc = {
      canteenId: membership.canteenId,
      name,
      description: assertText(dish.description?.trim(), 'Description') || undefined,
      defaultPriceXof: dish.defaultPriceXof,
      allergens,
      recipe: { ...dish.recipe, lines: assertListLength(dish.recipe.lines, 'Recette') },
    }
    if (!dishId) return await ctx.db.insert('dishes', doc)
    await getOwned(ctx, membership, dishId)
    // Une offre publiée a été vue (et peut-être réservée) avec ces informations : pas de réécriture silencieuse.
    const published = await ctx.db
      .query('menuItems')
      .withIndex('by_dish_status', (q) => q.eq('dishId', dishId).eq('status', 'published'))
      .first()
    if (published) {
      throw new ConvexError('Ce plat est déjà publié : créez une nouvelle version au lieu de le modifier.')
    }
    await ctx.db.replace(dishId, doc)
    return dishId
  },
})
