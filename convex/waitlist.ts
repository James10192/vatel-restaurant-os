/**
 * Liste d'attente (#4) : un usager s'inscrit sur une offre complète ; une annulation prévient la plus ancienne
 * inscription non encore prévenue (notification générique, sans nom de plat sur l'écran verrouillé).
 * La place n'est pas bloquée : la réservation reste le parcours normal, avec confirmation et débit.
 */
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireMember } from './lib/access'
import { requirePolicy } from './lib/booking'
import { activeBookingsCount } from './lib/capacity'
import { cutoffAt } from './lib/policy'
import { entriesOf } from './lib/waitlist'


export const join = mutation({
  args: { menuItemId: v.id('menuItems') },
  returns: v.null(),
  handler: async (ctx, { menuItemId }) => {
    const membership = await requireMember(ctx)
    const item = await getOwned(ctx, membership, menuItemId)
    if (item.status !== 'published') throw new ConvexError('Ce repas n’est pas encore publié.')
    if (Date.now() >= cutoffAt(await requirePolicy(ctx, membership), item.date, item.service)) throw new ConvexError('Les réservations sont closes pour ce service.')
    if ((await activeBookingsCount(ctx, menuItemId)) < item.capacity) throw new ConvexError('Des portions sont encore disponibles : réservez directement.')
    const entries = await entriesOf(ctx, menuItemId)
    if (entries.some((e) => e.profileId === membership._id)) return null
    await ctx.db.insert('waitlist', { canteenId: membership.canteenId, menuItemId, profileId: membership._id })
    return null
  },
})

export const leave = mutation({
  args: { menuItemId: v.id('menuItems') },
  returns: v.null(),
  handler: async (ctx, { menuItemId }) => {
    const membership = await requireMember(ctx)
    const mine = (await entriesOf(ctx, menuItemId)).filter((e) => e.profileId === membership._id)
    await Promise.all(mine.map((e) => ctx.db.delete(e._id)))
    return null
  },
})

/** Offres sur lesquelles l'usager attend une place. */
export const mine = query({
  args: {},
  returns: v.array(v.id('menuItems')),
  handler: async (ctx) => {
    const membership = await requireMember(ctx)
    const entries = await ctx.db.query('waitlist').withIndex('by_profile', (q) => q.eq('profileId', membership._id)).collect()
    return entries.map((e) => e.menuItemId)
  },
})
