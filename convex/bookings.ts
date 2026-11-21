import { ConvexError, v } from 'convex/values'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { getOwned, requireMember } from './lib/access'
import { assertIsoDate } from './lib/validation'
import { appendEntry, getOrCreateWallet } from './lib/ledger'
import { cutoffAt, policyOf } from './lib/policy'
import { activeBookingsCount } from './lib/capacity'
import type { Membership } from './lib/access'

async function requirePolicy(ctx: QueryCtx, membership: Membership) {
  const canteen = await ctx.db.get(membership.canteenId)
  if (!canteen) throw new ConvexError('Établissement introuvable.')
  return policyOf(canteen)
}

/**
 * Réserve un repas : vérifie publication, échéance, doublon, capacité et solde, puis débite et
 * enregistre la réservation dans UNE transaction. Idempotente par clé client.
 */
export const book = mutation({
  args: { menuItemId: v.id('menuItems'), idempotencyKey: v.string() },
  returns: v.object({ bookingId: v.id('bookings'), balanceXof: v.number(), replayed: v.boolean() }),
  handler: async (ctx, { menuItemId, idempotencyKey }) => {
    const membership = await requireMember(ctx)
    const wallet = await getOrCreateWallet(ctx, membership)

    const previous = await ctx.db
      .query('bookings')
      .withIndex('by_profile_key', (q) => q.eq('profileId', membership._id).eq('idempotencyKey', idempotencyKey))
      .unique()
    if (previous) {
      if (previous.menuItemId !== menuItemId) throw new ConvexError('Demande déjà traitée pour un autre repas.')
      return { bookingId: previous._id, balanceXof: wallet.balanceXof, replayed: true }
    }

    const item = await getOwned(ctx, membership, menuItemId)
    if (item.status !== 'published') throw new ConvexError('Ce repas n’est pas encore publié.')
    if (Date.now() >= cutoffAt(await requirePolicy(ctx, membership), item.date, item.service)) {
      throw new ConvexError('Les réservations sont closes pour ce service.')
    }
    const sameService = await ctx.db
      .query('bookings')
      .withIndex('by_profile_date', (q) => q.eq('profileId', membership._id).eq('date', item.date))
      .collect()
    if (sameService.some((b) => b.service === item.service && b.status !== 'cancelled')) {
      throw new ConvexError('Vous avez déjà un repas réservé pour ce service.')
    }
    if ((await activeBookingsCount(ctx, menuItemId)) >= item.capacity) {
      throw new ConvexError('Plus de portions disponibles pour ce plat.')
    }
    const dish = await ctx.db.get(item.dishId)
    if (!dish) throw new ConvexError('Plat introuvable.')
    if (wallet.balanceXof < item.priceXof) throw new ConvexError('Solde insuffisant. Rechargez votre compte.')

    const bookingId = await ctx.db.insert('bookings', {
      canteenId: membership.canteenId,
      profileId: membership._id,
      menuItemId,
      date: item.date,
      service: item.service,
      dishName: dish.name,
      priceXof: item.priceXof,
      status: 'confirmed',
      idempotencyKey,
    })
    const balanceXof = await appendEntry(ctx, wallet, {
      kind: 'booking_debit',
      amountXof: -item.priceXof,
      label: `Réservation : ${dish.name}`,
      bookingId,
    })
    return { bookingId, balanceXof, replayed: false }
  },
})

/** Annule avant l'échéance et rembourse le prix figé, une seule fois (le statut l'empêche ensuite). */
export const cancel = mutation({
  args: { bookingId: v.id('bookings') },
  returns: v.object({ balanceXof: v.number() }),
  handler: async (ctx, { bookingId }) => {
    const membership = await requireMember(ctx)
    const booking = await ctx.db.get(bookingId)
    if (!booking || booking.profileId !== membership._id) throw new ConvexError('Réservation introuvable.')
    if (booking.status !== 'confirmed') throw new ConvexError('Cette réservation ne peut plus être annulée.')
    if (Date.now() >= cutoffAt(await requirePolicy(ctx, membership), booking.date, booking.service)) {
      throw new ConvexError('Délai d’annulation dépassé pour ce service.')
    }
    await ctx.db.patch(bookingId, { status: 'cancelled' })
    const wallet = await getOrCreateWallet(ctx, membership)
    const balanceXof = await appendEntry(ctx, wallet, {
      kind: 'booking_refund',
      amountXof: booking.priceXof,
      label: `Annulation : ${booking.dishName}`,
      bookingId,
    })
    return { balanceXof }
  },
})

/** Réservations du membre à partir d'une date (incluse), ordre chronologique. */
export const mine = query({
  args: { from: v.string() },
  handler: async (ctx, { from }) => {
    const membership = await requireMember(ctx)
    const policy = await requirePolicy(ctx, membership)
    const bookings = await ctx.db
      .query('bookings')
      .withIndex('by_profile_date', (q) => q.eq('profileId', membership._id).gte('date', assertIsoDate(from)))
      .collect()
    return bookings.map((b) => ({
      _id: b._id,
      menuItemId: b.menuItemId,
      date: b.date,
      service: b.service,
      dishName: b.dishName,
      priceXof: b.priceXof,
      status: b.status,
      cancellableUntil: cutoffAt(policy, b.date, b.service),
    }))
  },
})
