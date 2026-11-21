import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { getOwned, requireAdmin, requireMember } from './lib/access'
import { addDays, weekStartOf } from './lib/dates'
import { assertCapacity, assertIsoDate, assertPriceXof } from './lib/validation'
import { activeBookingsCount } from './lib/capacity'
import { cutoffAt, policyOf } from './lib/policy'
import { serviceValidator } from './schema'
import { adminWeekReturns, publishedWeekReturns } from './lib/returns'

async function itemsOfWeek(ctx: QueryCtx, canteenId: Doc<'canteens'>['_id'], weekStart: string) {
  const start = weekStartOf(assertIsoDate(weekStart))
  return await ctx.db
    .query('menuItems')
    .withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', addDays(start, 6)))
    .collect()
}

async function withDishes(ctx: QueryCtx, items: Array<Doc<'menuItems'>>) {
  const dishes = await Promise.all(items.map((item) => ctx.db.get(item.dishId)))
  return items.flatMap((item, i) => {
    const dish = dishes[i]
    return dish ? [{ item, dish }] : []
  })
}

/** Semaine complète (brouillons inclus) pour l'administration. */
export const adminWeek = query({
  args: { weekStart: v.string() },
  returns: adminWeekReturns,
  handler: async (ctx, { weekStart }) => {
    const { canteenId } = await requireAdmin(ctx)
    const rows = await withDishes(ctx, await itemsOfWeek(ctx, canteenId, weekStart))
    return rows.map(({ item, dish }) => ({ ...item, dishName: dish.name, allergens: dish.allergens }))
  },
})

/** Semaine publiée, visible par tout membre rattaché. Projection minimale, sans recette ni coûts. */
export const publishedWeek = query({
  args: { weekStart: v.string() },
  returns: publishedWeekReturns,
  handler: async (ctx, { weekStart }) => {
    const { canteenId } = await requireMember(ctx)
    const canteen = await ctx.db.get(canteenId)
    if (!canteen) throw new ConvexError('Établissement introuvable.')
    const policy = policyOf(canteen)
    const items = (await itemsOfWeek(ctx, canteenId, weekStart)).filter((item) => item.status === 'published')
    const rows = await withDishes(ctx, items)
    const booked = await Promise.all(rows.map(({ item }) => activeBookingsCount(ctx, item._id)))
    return rows.map(({ item, dish }, i) => ({
      _id: item._id,
      date: item.date,
      service: item.service,
      priceXof: item.priceXof,
      capacity: item.capacity,
      remaining: Math.max(item.capacity - booked[i], 0),
      bookableUntil: cutoffAt(policy, item.date, item.service),
      dishName: dish.name,
      description: dish.description,
      allergens: dish.allergens,
    }))
  },
})

export const addItem = mutation({
  args: { date: v.string(), service: serviceValidator, dishId: v.id('dishes'), capacity: v.number() },
  returns: v.id('menuItems'),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx)
    const dish = await getOwned(ctx, membership, args.dishId)
    return await ctx.db.insert('menuItems', {
      canteenId: membership.canteenId,
      date: assertIsoDate(args.date),
      service: args.service,
      dishId: dish._id,
      priceXof: dish.defaultPriceXof,
      capacity: assertCapacity(args.capacity),
      status: 'draft',
    })
  },
})

/** Prix et capacité modifiables ; les réservations existantes garderont leur prix figé (A2). */
export const updateItem = mutation({
  args: { itemId: v.id('menuItems'), priceXof: v.number(), capacity: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx)
    await getOwned(ctx, membership, args.itemId)
    const booked = await activeBookingsCount(ctx, args.itemId)
    if (args.capacity < booked) throw new ConvexError(`Déjà ${booked} portions réservées : capacité trop basse.`)
    await ctx.db.patch(args.itemId, { priceXof: assertPriceXof(args.priceXof), capacity: assertCapacity(args.capacity) })
    return null
  },
})

/** Seul un brouillon peut être retiré ; une offre publiée doit rester traçable. */
export const removeItem = mutation({
  args: { itemId: v.id('menuItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const membership = await requireAdmin(ctx)
    const item = await getOwned(ctx, membership, itemId)
    if (item.status !== 'draft') throw new ConvexError('Un plat publié ne peut pas être retiré.')
    await ctx.db.delete(itemId)
    return null
  },
})

/** Publie tous les brouillons de la semaine en une seule transaction. */
export const publishWeek = mutation({
  args: { weekStart: v.string() },
  returns: v.object({ published: v.number() }),
  handler: async (ctx, { weekStart }) => {
    const { canteenId } = await requireAdmin(ctx)
    const drafts = (await itemsOfWeek(ctx, canteenId, weekStart)).filter((item) => item.status === 'draft')
    await Promise.all(drafts.map((item) => ctx.db.patch(item._id, { status: 'published' })))
    return { published: drafts.length }
  },
})
