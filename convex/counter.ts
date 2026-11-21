/**
 * Comptoir (#4) : ce dont l'agent de distribution a besoin sans QR ni smartphone. Recherche d'une réservation
 * par nom (bornée à un jour, 10 résultats) et comptage des repas servis sans réservation.
 */
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireCounter } from './lib/access'
import { todayUtc } from './lib/dates'
import { policyOf, slotPolicyOf } from './lib/policy'
import { countBySlot, slotsOf } from './lib/slots'
import { assertIdempotencyKey, assertIsoDate, toKey } from './lib/validation'
import { MEMBER_FALLBACK, memberNames } from './lib/names'
import { serviceValidator } from './schema'

const MAX_RESULTS = 10

/** Réservations actives du jour dont le nom affiché contient la recherche (casse et accents ignorés). */
export const searchDiner = query({
  args: { date: v.string(), name: v.string() },
  returns: v.array(
    v.object({
      bookingId: v.id('bookings'),
      diner: v.string(),
      dishName: v.string(),
      service: serviceValidator,
      status: v.union(v.literal('confirmed'), v.literal('picked_up')),
    }),
  ),
  handler: async (ctx, { date, name }) => {
    const { canteenId } = await requireCounter(ctx)
    const needle = toKey(name.slice(0, 60))
    if (needle.length < 2) return []
    const bookings = (await ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', assertIsoDate(date))).collect()).filter(
      (b) => b.status !== 'cancelled',
    )
    const names = await memberNames(ctx, bookings.map((b) => b.profileId))
    const nameOf = (b: (typeof bookings)[number]) => names.get(b.profileId) ?? MEMBER_FALLBACK
    return bookings
      .filter((b) => toKey(nameOf(b)).includes(needle))
      .slice(0, MAX_RESULTS)
      .map((b) => ({ bookingId: b._id, diner: nameOf(b), dishName: b.dishName, service: b.service, status: b.status === 'picked_up' ? ('picked_up' as const) : ('confirmed' as const) }))
  },
})

/** Un repas servi au comptoir sans réservation, aujourd'hui seulement. Mesure réelle des « passages ». */
export const recordWalkIn = mutation({
  args: { menuItemId: v.id('menuItems'), idempotencyKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { menuItemId, idempotencyKey }) => {
    const membership = await requireCounter(ctx)
    const item = await getOwned(ctx, membership, menuItemId)
    if (item.status !== 'published') throw new ConvexError('Offre non publiée.')
    if (item.date !== todayUtc()) throw new ConvexError('Les repas sans réservation se comptent le jour même.')
    const key = assertIdempotencyKey(idempotencyKey)
    const events = await ctx.db.query('productionEvents').withIndex('by_menu_item', (q) => q.eq('menuItemId', menuItemId)).collect()
    if (events.some((e) => e.idempotencyKey === key)) return null
    await ctx.db.insert('productionEvents', {
      canteenId: membership.canteenId,
      menuItemId,
      date: item.date,
      service: item.service,
      kind: 'walkin',
      portions: 1,
      profileId: membership._id,
      idempotencyKey: key,
    })
    return null
  },
})

/**
 * Flux par créneau (tableau du comptoir) : réservés et remis par créneau de chaque service du jour.
 * Vide si l'établissement n'utilise pas de créneaux.
 */
export const slotFlow = query({
  args: { date: v.string() },
  returns: v.array(v.object({ service: serviceValidator, slot: v.string(), booked: v.number(), pickedUp: v.number(), capacity: v.number() })),
  handler: async (ctx, { date }) => {
    const membership = await requireCounter(ctx)
    const canteen = await ctx.db.get(membership.canteenId)
    if (!canteen) throw new ConvexError('Établissement introuvable.')
    const day = assertIsoDate(date)
    const bookings = (await ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', membership.canteenId).eq('date', day)).collect()).filter(
      (b) => b.status !== 'cancelled',
    )
    return (['lunch', 'dinner'] as const).flatMap((service) => {
      const slotPolicy = slotPolicyOf(policyOf(canteen), service)
      if (!slotPolicy) return []
      const ofService = bookings.filter((b) => b.service === service)
      const booked = countBySlot(ofService)
      const pickedUp = countBySlot(ofService.filter((b) => b.status === 'picked_up'))
      return slotsOf(slotPolicy).map((slot) => ({ service, slot, booked: booked[slot] ?? 0, pickedUp: pickedUp[slot] ?? 0, capacity: slotPolicy.slotCapacity }))
    })
  },
})
