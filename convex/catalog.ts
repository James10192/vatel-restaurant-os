import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin } from './lib/access'
import { allergenCodeValidator } from './lib/allergens'
import { cleanName } from './lib/validation'
import { cleanAllergyList } from './lib/allergies'

const entry = v.object({ _id: v.string(), name: v.string() })
const ingredientEntry = v.object({
  _id: v.string(),
  name: v.string(),
  allergens: v.optional(v.array(allergenCodeValidator)),
  otherAllergens: v.optional(v.array(v.string())),
})

/** Unités et ingrédients de l'établissement, triés par nom. */
export const references = query({
  args: {},
  returns: v.object({ units: v.array(entry), ingredients: v.array(ingredientEntry) }),
  handler: async (ctx) => {
    const { canteenId } = await requireAdmin(ctx)
    const [units, ingredients] = await Promise.all([
      ctx.db.query('units').withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId)).collect(),
      ctx.db.query('ingredients').withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId)).collect(),
    ])
    const project = (d: { _id: string; name: string }) => ({ _id: d._id, name: d.name })
    return {
      units: units.map(project),
      ingredients: ingredients.map((d) => ({ ...project(d), allergens: d.allergens, otherAllergens: d.otherAllergens })),
    }
  },
})

/*
 * Création au point d'usage, idempotente : un nom déjà existant (casse/accents ignorés)
 * renvoie l'élément existant au lieu de créer un doublon.
 */

export const createUnit = mutation({
  args: { name: v.string() },
  returns: v.object({ _id: v.id('units'), name: v.string(), created: v.boolean() }),
  handler: async (ctx, args) => {
    const { canteenId } = await requireAdmin(ctx)
    const { name, key } = cleanName(args.name, 'Unité')
    const existing = await ctx.db
      .query('units')
      .withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId).eq('key', key))
      .unique()
    if (existing) return { _id: existing._id, name: existing.name, created: false }
    return { _id: await ctx.db.insert('units', { canteenId, name, key }), name, created: true }
  },
})

export const createIngredient = mutation({
  args: { name: v.string() },
  returns: v.object({ _id: v.id('ingredients'), name: v.string(), created: v.boolean() }),
  handler: async (ctx, args) => {
    const { canteenId } = await requireAdmin(ctx)
    const { name, key } = cleanName(args.name, 'Ingrédient')
    const existing = await ctx.db
      .query('ingredients')
      .withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId).eq('key', key))
      .unique()
    if (existing) return { _id: existing._id, name: existing.name, created: false }
    return { _id: await ctx.db.insert('ingredients', { canteenId, name, key }), name, created: true }
  },
})

/**
 * Allergènes d'un ingrédient (#13), liste fermée des 14 allergènes majeurs. Liste vide = aucun allergène (déclaration
 * explicite), différent d'un ingrédient jamais renseigné. Les plats déjà enregistrés gardent leur déclaration : elle est
 * recalculée au prochain enregistrement de leur fiche.
 */
export const setIngredientAllergens = mutation({
  args: { ingredientId: v.id('ingredients'), allergens: v.array(allergenCodeValidator), others: v.optional(v.array(v.string())) },
  returns: v.null(),
  handler: async (ctx, { ingredientId, allergens, others }) => {
    const membership = await requireAdmin(ctx)
    await getOwned(ctx, membership, ingredientId)
    const clean = cleanAllergyList({ codes: allergens, others: others ?? [] })
    await ctx.db.patch(ingredientId, { allergens: clean.codes, otherAllergens: clean.others.length ? clean.others : undefined })
    return null
  },
})
