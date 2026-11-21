import { ConvexError, v } from 'convex/values'
import type { Infer } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin } from './lib/access'
import { assertListLength, assertPositive, assertPriceXof, assertText, cleanName } from './lib/validation'
import { allergenInfoValidator, recipeLineValidator } from './schema'
import { dishListReturns } from './lib/returns'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from './lib/allergens'
import { isEmptyUnknownSheet, keepsPublishedIdentity } from './lib/dishSheet'

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
    const photos = await Promise.all(dishes.map((d) => (d.photoId ? ctx.storage.getUrl(d.photoId) : null)))
    return dishes
      .map((d, i) => ({ ...d, published: published[i] !== null, photoUrl: photos[i] ?? undefined }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
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
    const existing = await getOwned(ctx, membership, dishId)
    // Une offre publiée a été vue (et peut-être réservée) avec ces informations : pas de réécriture silencieuse.
    const published = await ctx.db
      .query('menuItems')
      .withIndex('by_dish_status', (q) => q.eq('dishId', dishId).eq('status', 'published'))
      .first()
    if (published && !isEmptyUnknownSheet(existing)) {
      throw new ConvexError('Ce plat est déjà publié : créez une nouvelle version au lieu de le modifier.')
    }
    if (published && !keepsPublishedIdentity(existing, doc)) {
      throw new ConvexError('Plat publié : complétez sa composition, mais gardez son nom, sa description et son prix.')
    }
    // La photo se gère à part (setPhoto) : modifier la fiche ne doit pas l'effacer.
    await ctx.db.replace(dishId, { ...doc, photoId: existing.photoId })
    return dishId
  },
})

const cleanList = (items: Array<string>, label: string) => [...new Set(assertListLength(items, label).map((a) => a.trim()).filter(Boolean))]

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
  const fromRecipe = [
    ...ALLERGEN_CODES.filter((code) => codes.has(code)).map((code) => ALLERGEN_LABELS[code]),
    ...ingredients.flatMap((ingredient) => ingredient.otherAllergens ?? []),
  ]
  return {
    status: 'declared' as const,
    present: cleanList([...fromRecipe, ...declared.present], 'Allergènes'),
    traces: cleanList(declared.traces, 'Traces'),
  }
}

/** Photo : 3 Mo au plus, image uniquement (le navigateur la réduit avant l'envoi). */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024

/** Adresse d'envoi à usage unique pour une photo de plat (administration seulement). */
export const generatePhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Photo RÉELLE d'un plat de l'établissement, ou retrait (`photoId: null`). Autorisée même sur un plat publié :
 * la photo ne change ni la composition, ni le prix, ni les allergènes. Le fichier doit être une image de 3 Mo au plus.
 */
export const setPhoto = mutation({
  args: { dishId: v.id('dishes'), photoId: v.union(v.id('_storage'), v.null()) },
  returns: v.null(),
  handler: async (ctx, { dishId, photoId }) => {
    const membership = await requireAdmin(ctx)
    const dish = await getOwned(ctx, membership, dishId)
    if (photoId !== null) {
      const file = await ctx.db.system.get(photoId)
      if (!file) throw new ConvexError('Photo introuvable : renvoyez le fichier.')
      if (!file.contentType?.startsWith('image/')) throw new ConvexError('Le fichier doit être une image.')
      if (file.size > MAX_PHOTO_BYTES) throw new ConvexError('Photo trop lourde : 3 Mo au plus.')
    }
    await ctx.db.patch(dishId, { photoId: photoId ?? undefined })
    // L'ancienne photo n'est supprimée que si plus aucun plat (ex. une version précédente) ne l'utilise.
    const previous = dish.photoId
    if (previous && previous !== photoId) {
      const stillUsed = await ctx.db
        .query('dishes')
        .withIndex('by_canteen', (q) => q.eq('canteenId', membership.canteenId))
        .filter((q) => q.eq(q.field('photoId'), previous))
        .first()
      if (!stillUsed) await ctx.storage.delete(previous)
    }
    return null
  },
})
