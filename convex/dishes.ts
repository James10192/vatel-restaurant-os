import { ConvexError, v } from 'convex/values'
import type { Infer } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin } from './lib/access'
import { assertListLength, assertPositive, assertPriceXof, assertText, cleanName } from './lib/validation'
import { allergenInfoValidator, recipeLineValidator } from './schema'
import { dishListReturns } from './lib/returns'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from './lib/allergens'

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
    // Verrou connu d'avance : un plat déjà publié n'est plus modifiable (on en crée une nouvelle version).
    const published = await Promise.all(
      dishes.map((d) => ctx.db.query('menuItems').withIndex('by_dish_status', (q) => q.eq('dishId', d._id).eq('status', 'published')).first()),
    )
    return dishes.map((d, i) => ({ ...d, published: published[i] !== null })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
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
    const ingredients: Array<Doc<'ingredients'>> = []
    for (const line of dish.recipe.lines) {
      assertPositive(line.quantity, 'Quantité')
      if (line.lossPct !== undefined && !(line.lossPct >= 0 && line.lossPct < 100)) {
        throw new ConvexError('Perte à la préparation : entre 0 et 99 %.')
      }
      ingredients.push(await getOwned(ctx, membership, line.ingredientId))
      await getOwned(ctx, membership, line.unitId)
    }
    const allergens = deriveAllergens(ingredients, dish.allergens)
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

const cleanList = (list: Array<string>, label: string) => [...new Set(assertListLength(list, label).map((a) => a.trim()).filter(Boolean))]

/**
 * Allergènes du plat (#13) : déduits des ingrédients de la fiche, jamais d'une seule saisie libre.
 * - Fiche vide : la déclaration manuelle fait foi (ou « non renseignés »).
 * - Un seul ingrédient non renseigné : le plat est « non renseigné » (échec fermé : on ne présente jamais un inconnu
 *   comme absent).
 * - Sinon : union des allergènes des ingrédients, complétée des mentions manuelles (garniture hors fiche, traces).
 */
function deriveAllergens(ingredients: Array<Doc<'ingredients'>>, manual: Infer<typeof allergenInfoValidator>) {
  const declared = manual.status === 'declared' ? manual : { present: [], traces: [] }
  if (ingredients.length === 0) {
    return manual.status === 'unknown'
      ? manual
      : { status: 'declared' as const, present: cleanList(declared.present, 'Allergènes'), traces: cleanList(declared.traces, 'Traces') }
  }
  if (ingredients.some((ingredient) => ingredient.allergens === undefined)) return { status: 'unknown' as const }
  const codes = new Set(ingredients.flatMap((ingredient) => ingredient.allergens ?? []))
  const fromRecipe = ALLERGEN_CODES.filter((code) => codes.has(code)).map((code) => ALLERGEN_LABELS[code])
  return {
    status: 'declared' as const,
    present: cleanList([...fromRecipe, ...declared.present], 'Allergènes'),
    traces: cleanList(declared.traces, 'Traces'),
  }
}
