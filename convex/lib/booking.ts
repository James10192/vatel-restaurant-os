import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOwned } from './access'
import type { Membership } from './access'
import { activeBookingsCount } from './capacity'
import { appendEntry, getOrCreateWallet } from './ledger'
import { cutoffAt, policyOf, slotPolicyOf } from './policy'
import type { Policy } from './policy'
import { assignSlot, countBySlot, slotRefusal } from './slots'
import { leaveWaitlist } from './waitlist'

type Service = Doc<'bookings'>['service']

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
export async function bookMeal(ctx: MutationCtx, membership: Membership, menuItemId: Id<'menuItems'>, idempotencyKey: string, wantedSlot?: string) {
  const item = await getOwned(ctx, membership, menuItemId)
  if (item.status !== 'published') throw new ConvexError('Ce repas n’est pas encore publié.')
  const policy = await requirePolicy(ctx, membership)
  if (Date.now() >= cutoffAt(policy, item.date, item.service)) {
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
  const slot = await placeInService(ctx, membership, policy, item.date, item.service, wantedSlot)
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
    slot,
  })
  const balanceXof = await appendEntry(ctx, wallet, { kind: 'booking_debit', amountXof: -item.priceXof, label: `Réservation : ${dish.name}`, bookingId })
  await leaveWaitlist(ctx, menuItemId, membership._id)
  return { bookingId, date: item.date, slot, balanceXof }
}

export type ServiceDecision = { ok: true; slot?: string } | { ok: false; reason: string }

/**
 * Décision pure : capacité globale du service, puis créneau (celui demandé, respecté ou refusé ; sinon le premier
 * libre). Aucun débordement promis. Utilisée pour réserver (refus levé) et pour la liste d'attente (lue).
 */
export function decideService(policy: Policy, service: Service, active: Array<{ slot?: string }>, wantedSlot?: string): ServiceDecision {
  if (policy.serviceCapacity && active.length >= policy.serviceCapacity[service]) return { ok: false, reason: 'Service complet : plus de place pour ce service.' }
  const slotPolicy = slotPolicyOf(policy, service)
  if (!slotPolicy) return { ok: true }
  const taken = countBySlot(active)
  if (wantedSlot !== undefined) {
    const refusal = slotRefusal(slotPolicy, taken, wantedSlot)
    return refusal ? { ok: false, reason: refusal } : { ok: true, slot: wantedSlot }
  }
  const slot = assignSlot(slotPolicy, taken)
  return slot ? { ok: true, slot } : { ok: false, reason: 'Tous les créneaux de retrait sont complets.' }
}

/** Réservations actives d'un service, lues seulement si l'établissement limite le service ou utilise des créneaux. */
async function serviceLoad(ctx: QueryCtx, membership: Membership, policy: Policy, date: string, service: Service) {
  return policy.serviceCapacity || slotPolicyOf(policy, service) ? await activeInService(ctx, membership.canteenId, date, service) : []
}

/** Place dans le service pour une nouvelle réservation : créneau attribué (ou undefined), ou refus explicite. */
export async function placeInService(ctx: QueryCtx, membership: Membership, policy: Policy, date: string, service: Service, wantedSlot?: string) {
  const decision = decideService(policy, service, await serviceLoad(ctx, membership, policy, date, service), wantedSlot)
  if (!decision.ok) throw new ConvexError(decision.reason)
  return decision.slot
}

/** Le service refuserait-il une réservation (capacité globale ou créneaux pleins) ? */
export async function serviceFull(ctx: QueryCtx, membership: Membership, policy: Policy, date: string, service: Service) {
  return !decideService(policy, service, await serviceLoad(ctx, membership, policy, date, service)).ok
}

const activeInService = async (ctx: QueryCtx, canteenId: Id<'canteens'>, date: string, service: Service) =>
  (
    await ctx.db
      .query('bookings')
      .withIndex('by_canteen_date_service', (q) => q.eq('canteenId', canteenId).eq('date', date).eq('service', service))
      .collect()
  ).filter((b) => b.status !== 'cancelled')

/** Réservations actives par créneau d'un service (pour proposer ou changer un créneau). */
export const slotLoad = async (ctx: QueryCtx, canteenId: Id<'canteens'>, date: string, service: Service) =>
  countBySlot(await activeInService(ctx, canteenId, date, service))

/** Réservation telle que la voit son auteur (Mes repas, accueil) : jamais d'identifiant d'autrui. */
export const myBookingRow = (b: Doc<'bookings'>, policy: Policy) => ({
  _id: b._id,
  menuItemId: b.menuItemId,
  date: b.date,
  service: b.service,
  dishName: b.dishName,
  priceXof: b.priceXof,
  status: b.status,
  cancellableUntil: cutoffAt(policy, b.date, b.service),
  slot: b.slot,
})
