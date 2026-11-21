/**
 * Satisfaction (#3, #9) : l'usager note un repas qu'il a retiré, de 1 à 5. Une note par réservation,
 * modifiable ; jamais de texte libre. Sert aux indicateurs et aux « menus à améliorer ».
 */
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireMember } from './lib/access'
import { assertIsoDate } from './lib/validation'

export const rate = mutation({
  args: { bookingId: v.id('bookings'), score: v.number() },
  returns: v.null(),
  handler: async (ctx, { bookingId, score }) => {
    const membership = await requireMember(ctx)
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new ConvexError('Note : entier de 1 à 5.')
    const booking = await ctx.db.get(bookingId)
    if (!booking || booking.profileId !== membership._id) throw new ConvexError('Réservation introuvable.')
    if (booking.status !== 'picked_up') throw new ConvexError('Seul un repas retiré peut être noté.')
    const item = await ctx.db.get(booking.menuItemId)
    if (!item) throw new ConvexError('Élément introuvable.')
    const existing = await ctx.db.query('ratings').withIndex('by_booking', (q) => q.eq('bookingId', bookingId)).unique()
    if (existing) await ctx.db.patch(existing._id, { score })
    else
      await ctx.db.insert('ratings', {
        canteenId: booking.canteenId,
        bookingId,
        profileId: membership._id,
        menuItemId: booking.menuItemId,
        dishId: item.dishId,
        date: booking.date,
        score,
      })
    return null
  },
})

/** Notes données par l'usager sur ses repas à partir d'une date (pour afficher ses étoiles). */
export const mine = query({
  args: { from: v.string() },
  returns: v.array(v.object({ bookingId: v.id('bookings'), score: v.number() })),
  handler: async (ctx, { from }) => {
    const membership = await requireMember(ctx)
    const day = assertIsoDate(from)
    const bookings = await ctx.db.query('bookings').withIndex('by_profile_date', (q) => q.eq('profileId', membership._id).gte('date', day)).collect()
    const rows = await Promise.all(
      bookings.filter((b) => b.status === 'picked_up').map((b) => ctx.db.query('ratings').withIndex('by_booking', (q) => q.eq('bookingId', b._id)).unique()),
    )
    return rows.filter((r) => r !== null).map((r) => ({ bookingId: r.bookingId, score: r.score }))
  },
})
