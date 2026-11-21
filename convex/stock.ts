/**
 * Stocks (#6) : réceptions, inventaires et pertes de matière, saisis par la cuisine ; stock théorique déduit
 * des préparations. Toute écriture est un mouvement ajouté (jamais modifié) ; l'établissement vient du profil.
 */
import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import schema, { lossReasonValidator } from './schema'
import { getOwned, requireKitchen } from './lib/access'
import { isIsoDate, todayUtc } from './lib/dates'
import { loadStock } from './lib/stock/load'
import { assertIdempotencyKey } from './lib/validation'
import { convert } from './lib/stock/units'
import { MEMBER_FALLBACK, memberNames, unitNames } from './lib/names'

const movementFields = schema.tables.stockMovements.validator.fields

const MAX_QUANTITY = 1_000_000
const MAX_UNIT_COST_XOF = 1_000_000

const lotValidator = v.object({ lotCode: v.optional(v.string()), expiresOn: v.optional(v.string()), remaining: v.number() })

export const overview = query({
  args: {},
  returns: v.array(
    v.object({
      ingredientId: v.id('ingredients'),
      name: v.string(),
      unit: v.string(),
      theoretical: v.number(),
      lastCount: v.union(v.null(), v.object({ at: v.number(), quantity: v.number() })),
      incompatible: v.array(v.string()),
      lots: v.array(lotValidator),
      avgUnitCostXof: v.union(v.null(), v.number()),
      need: v.union(v.null(), v.number()),
      lastSupplier: v.union(v.null(), v.string()),
      lastUnitCostXof: v.union(v.null(), v.number()),
      usedIn: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const { canteenId } = await requireKitchen(ctx)
    const [rows, dishes] = await Promise.all([
      loadStock(ctx, canteenId, todayUtc()),
      ctx.db.query('dishes').withIndex('by_canteen', (q) => q.eq('canteenId', canteenId)).collect(),
    ])
    return rows
      .map((row) => ({ ...row, usedIn: dishes.filter((d) => d.recipe.lines.some((l) => l.ingredientId === row.ingredientId)).map((d) => d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  },
})

/** Derniers mouvements saisis (lecture bornée), pour relire et vérifier. */
export const recent = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('stockMovements'),
      at: v.number(),
      kind: movementFields.kind,
      ingredient: v.string(),
      quantity: v.number(),
      unit: v.string(),
      lotCode: v.union(v.null(), v.string()),
      expiresOn: v.union(v.null(), v.string()),
      supplier: v.union(v.null(), v.string()),
      lossReason: v.union(v.null(), lossReasonValidator),
      by: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const { canteenId } = await requireKitchen(ctx)
    const rows = await ctx.db.query('stockMovements').withIndex('by_canteen', (q) => q.eq('canteenId', canteenId)).order('desc').take(20)
    const [authors, units] = await Promise.all([memberNames(ctx, rows.map((m) => m.profileId)), unitNames(ctx, rows.map((m) => m.unitId))])
    return await Promise.all(
      rows.map(async (m) => {
        const ingredient = await ctx.db.get(m.ingredientId)
        return {
          _id: m._id,
          at: m._creationTime,
          kind: m.kind,
          ingredient: ingredient?.name ?? '?',
          quantity: m.quantity,
          unit: units.get(m.unitId) ?? '?',
          lotCode: m.lotCode ?? null,
          expiresOn: m.expiresOn ?? null,
          supplier: m.supplier ?? null,
          lossReason: m.lossReason ?? null,
          by: authors.get(m.profileId) ?? MEMBER_FALLBACK,
        }
      }),
    )
  },
})

const assertQuantity = (value: number, allowZero: boolean) => {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0) || value > MAX_QUANTITY) throw new ConvexError('Quantité invalide.')
  return value
}
const text = (value: string | undefined, label: string) => {
  const clean = value?.trim().replace(/\s+/g, ' ')
  if (clean && clean.length > 80) throw new ConvexError(`${label} : 80 caractères au maximum.`)
  return clean || undefined
}

const common = { ingredientId: v.id('ingredients'), quantity: v.number(), unitId: v.id('units'), idempotencyKey: v.string() }

/** Contrôles communs : cuisine, ingrédient et unité de l'établissement, clé neuve (sinon : déjà enregistré). */
async function prepare(ctx: QueryCtx, args: { ingredientId: Id<'ingredients'>; unitId: Id<'units'>; idempotencyKey: string }) {
  const membership = await requireKitchen(ctx)
  await getOwned(ctx, membership, args.ingredientId)
  await getOwned(ctx, membership, args.unitId)
  const key = assertIdempotencyKey(args.idempotencyKey)
  const existing = await ctx.db
    .query('stockMovements')
    .withIndex('by_canteen_ingredient', (q) => q.eq('canteenId', membership.canteenId).eq('ingredientId', args.ingredientId))
    .collect()
  const base = { canteenId: membership.canteenId, ingredientId: args.ingredientId, unitId: args.unitId, profileId: membership._id, idempotencyKey: key }
  return { membership, base, duplicate: existing.some((m) => m.idempotencyKey === key) }
}

export const receive = mutation({
  args: { ...common, lotCode: v.optional(v.string()), expiresOn: v.optional(v.string()), supplier: v.optional(v.string()), unitCostXof: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { base, duplicate } = await prepare(ctx, args)
    if (duplicate) return null
    if (args.expiresOn !== undefined && !isIsoDate(args.expiresOn)) throw new ConvexError('Date limite invalide.')
    if (args.unitCostXof !== undefined && (!Number.isInteger(args.unitCostXof) || args.unitCostXof < 0 || args.unitCostXof > MAX_UNIT_COST_XOF)) {
      throw new ConvexError('Prix unitaire : entier en FCFA attendu.')
    }
    await ctx.db.insert('stockMovements', {
      ...base,
      kind: 'reception',
      quantity: assertQuantity(args.quantity, false),
      lotCode: text(args.lotCode, 'Lot'),
      expiresOn: args.expiresOn,
      supplier: text(args.supplier, 'Fournisseur'),
      unitCostXof: args.unitCostXof,
    })
    return null
  },
})

/** Inventaire compté : nouveau point de départ du stock ; l'écart avec le théorique d'avant est conservé. */
export const count = mutation({
  args: common,
  returns: v.object({ expectedBefore: v.union(v.null(), v.number()) }),
  handler: async (ctx, args) => {
    const { membership, base, duplicate } = await prepare(ctx, args)
    if (duplicate) return { expectedBefore: null }
    const row = (await loadStock(ctx, membership.canteenId, todayUtc(), args.ingredientId)).at(0)
    const unit = (await ctx.db.get(args.unitId))?.name ?? '?'
    const expectedBefore = row ? convert(row.theoretical, row.unit, unit) : null
    await ctx.db.insert('stockMovements', { ...base, kind: 'count', quantity: assertQuantity(args.quantity, true), expectedBefore: expectedBefore ?? undefined })
    return { expectedBefore }
  },
})

/** Perte de matière (périmé, abîmé, autre) : sort du stock théorique, motif conservé. */
export const lose = mutation({
  args: { ...common, reason: lossReasonValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { base, duplicate } = await prepare(ctx, args)
    if (duplicate) return null
    await ctx.db.insert('stockMovements', { ...base, kind: 'loss', quantity: assertQuantity(args.quantity, false), lossReason: args.reason })
    return null
  },
})
