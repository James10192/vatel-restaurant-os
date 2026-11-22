/**
 * Mes repas (#21) : listes paginées côté serveur, pour ne jamais charger tout l'historique d'un usager.
 * À venir : réservations confirmées dès aujourd'hui, par date. Historique : retirées et annulées, de la plus
 * récente à la plus ancienne, avec la note éventuelle. Chaque requête ne lit que les réservations de l'appelant.
 */
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { v } from 'convex/values'
import { query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { requireMember } from './lib/access'
import type { Membership } from './lib/access'
import { myBookingRow, requirePolicy } from './lib/booking'
import { todayUtc } from './lib/dates'
import { myBookingsReturns } from './lib/returns'

const row = myBookingsReturns.element

/** Réservations encore à venir de l'appelant : confirmées, dès aujourd'hui, par date (une seule définition). */
const upcomingOf = (ctx: QueryCtx, membership: Membership) =>
  ctx.db.query('bookings').withIndex('by_profile_status_date', (q) => q.eq('profileId', membership._id).eq('status', 'confirmed').gte('date', todayUtc()))

export const upcoming = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(row),
  handler: async (ctx, { paginationOpts }) => {
    const membership = await requireMember(ctx)
    const policy = await requirePolicy(ctx, membership)
    const result = await upcomingOf(ctx, membership).paginate(paginationOpts)
    return { ...result, page: result.page.map((b) => myBookingRow(b, policy)) }
  },
})

export const history = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({ ...row.fields, score: v.optional(v.number()) })),
  handler: async (ctx, { paginationOpts }) => {
    const membership = await requireMember(ctx)
    const policy = await requirePolicy(ctx, membership)
    // Une absence (confirmée, jour passé) n'est ni à venir ni à noter : elle n'apparaît pas.
    const result = await ctx.db
      .query('bookings')
      .withIndex('by_profile_date', (q) => q.eq('profileId', membership._id))
      .order('desc')
      .filter((q) => q.neq(q.field('status'), 'confirmed'))
      .paginate(paginationOpts)
    const page = await Promise.all(
      result.page.map(async (b) => {
        const rating = b.status === 'picked_up' ? await ctx.db.query('ratings').withIndex('by_booking', (q) => q.eq('bookingId', b._id)).unique() : null
        return { ...myBookingRow(b, policy), score: rating?.score }
      }),
    )
    return { ...result, page }
  },
})

/** Chiffres de l'en-tête : nombre de repas à venir et crédits engagés (lecture de l'index des seules confirmées). */
export const summary = query({
  args: {},
  returns: v.object({ upcoming: v.number(), engagedXof: v.number() }),
  handler: async (ctx) => {
    const membership = await requireMember(ctx)
    const rows = await upcomingOf(ctx, membership).collect()
    return { upcoming: rows.length, engagedXof: rows.reduce((sum, b) => sum + b.priceXof, 0) }
  },
})
