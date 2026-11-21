import { internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { activeBookingsCount } from './capacity'

/** Inscriptions en liste d'attente d'une offre (lecture indexée). */
export const entriesOf = (ctx: QueryCtx, menuItemId: Id<'menuItems'>) =>
  ctx.db.query('waitlist').withIndex('by_menu_item', (q) => q.eq('menuItemId', menuItemId)).collect()

/**
 * Une réservation annulée libère une place sur son plat ET dans son service (capacité globale, créneau) : la plus
 * ancienne inscription que cette place aide (ce plat, ou un autre plat du service qui n'est pas lui-même complet)
 * est prévenue, puis retirée de la liste. Chaque place
 * libérée prévient donc une personne nouvelle ; sans suite de sa part, elle peut se réinscrire.
 */
export async function notifyNextWaiting(ctx: MutationCtx, booking: Doc<'bookings'>) {
  const sameService = (
    await ctx.db.query('menuItems').withIndex('by_canteen_date', (q) => q.eq('canteenId', booking.canteenId).eq('date', booking.date)).collect()
  ).filter((item) => item.service === booking.service)
  // Sur un autre plat, la place libérée n'aide que si ce plat a lui-même de la place (attente due au service).
  const helped = await Promise.all(
    sameService.map(async (item) => item._id === booking.menuItemId || (await activeBookingsCount(ctx, item._id)) < item.capacity),
  )
  const entries = (await Promise.all(sameService.filter((_, i) => helped[i]).map((item) => entriesOf(ctx, item._id)))).flat()
  const next = entries.sort((a, b) => a._creationTime - b._creationTime).at(0)
  if (!next) return
  await ctx.db.delete(next._id)
  await ctx.scheduler.runAfter(0, internal.pushSend.deliver, { target: { profileId: next.profileId }, kind: 'placeFreed' })
}

/** Retire l'usager de la liste d'attente d'une offre (après réservation, ou à sa demande). */
export async function leaveWaitlist(ctx: MutationCtx, menuItemId: Id<'menuItems'>, profileId: Id<'profiles'>) {
  const mine = (await entriesOf(ctx, menuItemId)).filter((e) => e.profileId === profileId)
  await Promise.all(mine.map((e) => ctx.db.delete(e._id)))
}
