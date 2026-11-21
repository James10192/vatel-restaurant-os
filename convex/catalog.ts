import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireAdmin } from './lib/access'
import { cleanName } from './lib/validation'

const entry = v.object({ _id: v.string(), name: v.string() })

/** Unités et ingrédients de l'établissement, triés par nom. */
export const references = query({
  args: {},
  returns: v.object({ units: v.array(entry), ingredients: v.array(entry) }),
  handler: async (ctx) => {
    const { canteenId } = await requireAdmin(ctx)
    const [units, ingredients] = await Promise.all([
      ctx.db.query('units').withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId)).collect(),
      ctx.db.query('ingredients').withIndex('by_canteen_key', (q) => q.eq('canteenId', canteenId)).collect(),
    ])
    const project = (d: { _id: string; name: string }) => ({ _id: d._id, name: d.name })
    return { units: units.map(project), ingredients: ingredients.map(project) }
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
