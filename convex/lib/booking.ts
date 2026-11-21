import { ConvexError } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOwned } from './access'
import type { Membership } from './access'
import { activeBookingsCount } from './capacity'
import { appendEntry, getOrCreateWallet } from './ledger'
import { cutoffAt, policyOf } from './policy'

export async function requirePolicy(ctx: QueryCtx, membership: Membership) {
  const canteen = await ctx.db.get(membership.canteenId)
  if (!canteen) throw new ConvexError('Établissement introuvable.')
  return policyOf(canteen)
}

/**
 * Une réservation : publication, échéance, un repas par service, capacité, solde, puis réservation et débit.
 * Toujours appelée dans une mutation : une erreur annule TOUT ce que la mutation a écrit (y compris un lot).
 * Le portefeuille est relu à chaque appel : dans un lot, chaque débit voit le solde laissé par le précédent.
 */
export async function bookMeal(ctx: MutationCtx, membership: Membership, menuItemId: Id<'menuItems'>, idempotencyKey: string) {
  const item = await getOwned(ctx, membership, menuItemId)
  if (item.status !== 'published') throw new ConvexError('Ce repas n’est pas encore publié.')
  if (Date.now() >= cutoffAt(await requirePolicy(ctx, membership), item.date, item.service)) {
    throw new ConvexError('Les réservations sont closes pour ce service.')
  }
  const sameDay = await ctx.db
    .query('bookings')
    .withIndex('by_profile_date', (q) => q.eq('profileId', membership._id).eq('date', item.date))
    .collect()
  if (sameDay.some((b) => b.service === item.service && b.status !== 'cancelled')) {
    throw new ConvexError('Vous avez déjà un repas réservé pour ce service.')
  }
  if ((await activeBookingsCount(ctx, menuItemId)) >= item.capacity) throw new ConvexError('Plus de portions disponibles pour ce plat.')
  const dish = await ctx.db.get(item.dishId)
  if (!dish) throw new ConvexError('Plat introuvable.')
  const wallet = await getOrCreateWallet(ctx, membership)
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
  const balanceXof = await appendEntry(ctx, wallet, { kind: 'booking_debit', amountXof: -item.priceXof, label: `Réservation : ${dish.name}`, bookingId })
  return { bookingId, date: item.date, balanceXof }
}
