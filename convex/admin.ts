import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCounter } from './lib/access'
import { tally } from './lib/production/load'
import { assertIsoDate } from './lib/validation'
import { serviceValidator } from './schema'
import { dayOrdersReturns, daySummaryReturns } from './lib/returns'

const bookingStatusValidator = v.union(
  v.literal('confirmed'),
  v.literal('cancelled'),
  v.literal('picked_up'),
)

/** Nom affichable d'un membre (projection minimale : jamais l'e-mail ni d'autre donnée). */
async function displayName(
  ctx: QueryCtx,
  profileId: Doc<'profiles'>['_id'],
): Promise<string> {
  const profile = await ctx.db.get(profileId)
  return profile?.displayName ?? 'Membre'
}

/**
 * Commandes d'un jour, filtrées côté serveur (index par service ou statut), triées par heure de réservation,
 * paginées. L'établissement vient du profil de l'admin, jamais du client.
 */
export const dayOrders = query({
  args: {
    date: v.string(),
    service: v.optional(serviceValidator),
    status: v.optional(bookingStatusValidator),
    menuItemId: v.optional(v.id('menuItems')),
    paginationOpts: paginationOptsValidator,
  },
  returns: dayOrdersReturns,
  handler: async (
    ctx,
    { date, service, status, menuItemId, paginationOpts },
  ) => {
    const { canteenId } = await requireCounter(ctx)
    const day = assertIsoDate(date)
    const base = service
      ? ctx.db
          .query('bookings')
          .withIndex('by_canteen_date_service', (q) =>
            q.eq('canteenId', canteenId).eq('date', day).eq('service', service),
          )
      : status
        ? ctx.db
            .query('bookings')
            .withIndex('by_canteen_date_status', (q) =>
              q.eq('canteenId', canteenId).eq('date', day).eq('status', status),
            )
        : ctx.db
            .query('bookings')
            .withIndex('by_canteen_date', (q) =>
              q.eq('canteenId', canteenId).eq('date', day),
            )
    const filtered = base.filter((q) =>
      q.and(
        service && status ? q.eq(q.field('status'), status) : true,
        menuItemId ? q.eq(q.field('menuItemId'), menuItemId) : true,
      ),
    )
    const result = await filtered.order('asc').paginate(paginationOpts)
    const page = await Promise.all(
      result.page.map(async (b) => ({
        _id: b._id,
        _creationTime: b._creationTime,
        service: b.service,
        dishName: b.dishName,
        priceXof: b.priceXof,
        status: b.status,
        slot: b.slot,
        diner: await displayName(ctx, b.profileId),
      })),
    )
    return { ...result, page }
  },
})

/**
 * Synthèse d'un jour par offre : capacité, réservés, retirés, annulés, restants.
 * Bornée à un jour d'un établissement. Montants = crédits de démonstration, pas des recettes.
 */
export const daySummary = query({
  args: { date: v.string() },
  returns: daySummaryReturns,
  handler: async (ctx, { date }) => {
    const { canteenId } = await requireCounter(ctx)
    const day = assertIsoDate(date)
    const [items, bookings, events] = await Promise.all([
      ctx.db
        .query('menuItems')
        .withIndex('by_canteen_date', (q) =>
          q.eq('canteenId', canteenId).eq('date', day),
        )
        .collect(),
      ctx.db
        .query('bookings')
        .withIndex('by_canteen_date', (q) =>
          q.eq('canteenId', canteenId).eq('date', day),
        )
        .collect(),
      ctx.db
        .query('productionEvents')
        .withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', day))
        .collect(),
    ])
    const published = items.filter((item) => item.status === 'published')
    const dishes = await Promise.all(
      published.map((item) => ctx.db.get(item.dishId)),
    )
    const count = (
      itemId: Doc<'menuItems'>['_id'],
      status: Doc<'bookings'>['status'],
    ) =>
      bookings.filter((b) => b.menuItemId === itemId && b.status === status)
        .length
    const offers = published.map((item, i) => {
      const confirmed = count(item._id, 'confirmed')
      const pickedUp = count(item._id, 'picked_up')
      return {
        menuItemId: item._id,
        service: item.service,
        dishName: dishes[i]?.name ?? 'Plat supprimé',
        priceXof: item.priceXof,
        capacity: item.capacity,
        confirmed,
        pickedUp,
        cancelled: count(item._id, 'cancelled'),
        remaining: Math.max(item.capacity - confirmed - pickedUp, 0),
        walkIns: tally(events.filter((e) => e.menuItemId === item._id)).walkIns,
      }
    })
    const sum = (
      key: 'capacity' | 'confirmed' | 'pickedUp' | 'cancelled' | 'remaining' | 'walkIns',
    ) => offers.reduce((total, offer) => total + offer[key], 0)
    const active = bookings.filter((b) => b.status !== 'cancelled')
    return {
      offers,
      totals: {
        capacity: sum('capacity'),
        confirmed: sum('confirmed'),
        pickedUp: sum('pickedUp'),
        cancelled: sum('cancelled'),
        remaining: sum('remaining'),
        walkIns: sum('walkIns'),
        demoAmountXof: active.reduce((total, b) => total + b.priceXof, 0),
      },
    }
  },
})

/** Enregistre la remise d'un repas : seule une réservation confirmée peut passer à « retirée », une seule fois. */
export const markPickedUp = mutation({
  args: { bookingId: v.id('bookings') },
  returns: v.null(),
  handler: async (ctx, { bookingId }) => {
    const { canteenId } = await requireCounter(ctx)
    const booking = await ctx.db.get(bookingId)
    if (!booking || booking.canteenId !== canteenId)
      throw new ConvexError('Réservation introuvable.')
    if (booking.status === 'picked_up')
      throw new ConvexError('Repas déjà remis.')
    if (booking.status !== 'confirmed')
      throw new ConvexError('Réservation annulée : remise impossible.')
    await ctx.db.patch(bookingId, { status: 'picked_up' })
    return null
  },
})
