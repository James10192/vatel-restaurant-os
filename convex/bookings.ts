import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireMember } from './lib/access'
import { assertIdempotencyKey, assertIsoDate } from './lib/validation'
import { appendEntry, getOrCreateWallet } from './lib/ledger'
import { bookMeal, requirePolicy, slotLoad } from './lib/booking'
import { alertIfLowBalance } from './lib/lowBalance'
import { cutoffAt, slotPolicyOf } from './lib/policy'
import { slotsOf } from './lib/slots'
import { myBookingsReturns } from './lib/returns'
import { notifyNextWaiting } from './lib/waitlist'

/**
 * Réserve un repas : vérifie publication, échéance, doublon, capacité et solde, puis débite et
 * enregistre la réservation dans UNE transaction. Idempotente par clé client.
 */
export const book = mutation({
  args: { menuItemId: v.id('menuItems'), idempotencyKey: v.string(), slot: v.optional(v.string()) },
  returns: v.object({ bookingId: v.id('bookings'), balanceXof: v.number(), replayed: v.boolean() }),
  handler: async (ctx, { menuItemId, idempotencyKey, slot }) => {
    assertIdempotencyKey(idempotencyKey)
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

    const { bookingId, balanceXof } = await bookMeal(ctx, membership, menuItemId, idempotencyKey, slot)
    await alertIfLowBalance(ctx, membership._id, wallet.balanceXof, balanceXof)
    return { bookingId, balanceXof, replayed: false }
  },
})

/** Plafond d'un lot : une semaine de repas (#16 SEC-07). */
export const MAX_BATCH = 7

/**
 * Réserve plusieurs repas en une confirmation (« Réserver ces repas » de l'Aide au choix). Tout ou rien :
 * chaque repas passe par les contrôles de `bookMeal` dans la même transaction ; un seul refus annule le lot
 * (aucun débit partiel) et le message nomme le jour concerné. Idempotent : un renvoi avec la même clé et les
 * mêmes repas rend le résultat d'origine ; la même clé avec d'autres repas est refusée.
 */
export const bookMany = mutation({
  args: { menuItemIds: v.array(v.id('menuItems')), idempotencyKey: v.string() },
  returns: v.object({ bookingIds: v.array(v.id('bookings')), balanceXof: v.number(), replayed: v.boolean() }),
  handler: async (ctx, { menuItemIds, idempotencyKey }) => {
    assertIdempotencyKey(idempotencyKey)
    if (menuItemIds.length === 0 || menuItemIds.length > MAX_BATCH) throw new ConvexError(`Entre 1 et ${MAX_BATCH} repas par réservation groupée.`)
    if (new Set(menuItemIds).size !== menuItemIds.length) throw new ConvexError('Le même repas apparaît deux fois.')
    const membership = await requireMember(ctx)
    const wallet = await getOrCreateWallet(ctx, membership)

    // Chaque réservation du lot porte la clé « clé:index » : un renvoi les retrouve toutes par plage d'index.
    const previous = await ctx.db
      .query('bookings')
      .withIndex('by_profile_key', (q) => q.eq('profileId', membership._id).gte('idempotencyKey', `${idempotencyKey}:`).lt('idempotencyKey', `${idempotencyKey};`))
      .collect()
    if (previous.length > 0) {
      const same = previous.length === menuItemIds.length && previous.every((b) => menuItemIds.includes(b.menuItemId))
      if (!same) throw new ConvexError('Demande déjà traitée pour d’autres repas.')
      return { bookingIds: previous.map((b) => b._id), balanceXof: wallet.balanceXof, replayed: true }
    }

    const bookingIds = []
    let balanceXof = wallet.balanceXof
    for (const [index, menuItemId] of menuItemIds.entries()) {
      try {
        const booked = await bookMeal(ctx, membership, menuItemId, `${idempotencyKey}:${index}`)
        bookingIds.push(booked.bookingId)
        balanceXof = booked.balanceXof
      } catch (error) {
        // Le lot entier est annulé par la transaction ; on précise seulement quel repas bloque.
        const item = await ctx.db.get(menuItemId)
        if (error instanceof ConvexError && typeof error.data === 'string' && item?.canteenId === membership.canteenId) {
          throw new ConvexError(`Repas du ${item.date} : ${error.data}`)
        }
        throw error
      }
    }
    await alertIfLowBalance(ctx, membership._id, wallet.balanceXof, balanceXof)
    return { bookingIds, balanceXof, replayed: false }
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
    await notifyNextWaiting(ctx, booking.menuItemId)
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
  returns: myBookingsReturns,
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
      slot: b.slot,
    }))
  },
})

/** Créneaux de retrait d'une offre avec les places restantes (vide si l'établissement n'en utilise pas). */
export const slotsFor = query({
  args: { menuItemId: v.id('menuItems') },
  returns: v.array(v.object({ slot: v.string(), remaining: v.number() })),
  handler: async (ctx, { menuItemId }) => {
    const membership = await requireMember(ctx)
    const item = await getOwned(ctx, membership, menuItemId)
    const slotPolicy = slotPolicyOf(await requirePolicy(ctx, membership), item.service)
    if (!slotPolicy) return []
    const taken = await slotLoad(ctx, membership.canteenId, item.date, item.service)
    return slotsOf(slotPolicy).map((slot) => ({ slot, remaining: Math.max(0, slotPolicy.slotCapacity - (taken[slot] ?? 0)) }))
  },
})

/** Change le créneau d'une réservation confirmée, avant la clôture et seulement vers un créneau qui a de la place. */
export const changeSlot = mutation({
  args: { bookingId: v.id('bookings'), slot: v.string() },
  returns: v.null(),
  handler: async (ctx, { bookingId, slot }) => {
    const membership = await requireMember(ctx)
    const booking = await ctx.db.get(bookingId)
    if (!booking || booking.profileId !== membership._id) throw new ConvexError('Réservation introuvable.')
    if (booking.status !== 'confirmed') throw new ConvexError('Cette réservation ne peut plus être modifiée.')
    const policy = await requirePolicy(ctx, membership)
    if (Date.now() >= cutoffAt(policy, booking.date, booking.service)) throw new ConvexError('Délai de modification dépassé pour ce service.')
    const slotPolicy = slotPolicyOf(policy, booking.service)
    if (!slotPolicy || !slotsOf(slotPolicy).includes(slot)) throw new ConvexError('Créneau inconnu.')
    if (slot === booking.slot) return null
    const taken = await slotLoad(ctx, membership.canteenId, booking.date, booking.service)
    if ((taken[slot] ?? 0) >= slotPolicy.slotCapacity) throw new ConvexError('Ce créneau est complet.')
    await ctx.db.patch(bookingId, { slot })
    return null
  },
})
