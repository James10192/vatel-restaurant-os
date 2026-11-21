import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/** Inscriptions en liste d'attente d'une offre (lecture indexée). */
export const entriesOf = (ctx: QueryCtx, menuItemId: Id<'menuItems'>) =>
  ctx.db.query('waitlist').withIndex('by_menu_item', (q) => q.eq('menuItemId', menuItemId)).collect()

/** Une place libérée sur l'offre : prévient la plus ancienne inscription non encore prévenue. */
export async function notifyNextWaiting(ctx: MutationCtx, menuItemId: Id<'menuItems'>) {
  const next = (await entriesOf(ctx, menuItemId)).filter((e) => e.notifiedAt === undefined).sort((a, b) => a._creationTime - b._creationTime).at(0)
  if (!next) return
  await ctx.db.patch(next._id, { notifiedAt: Date.now() })
  await ctx.scheduler.runAfter(0, internal.pushSend.deliver, { target: { profileId: next.profileId }, kind: 'placeFreed' })
}

/** L'usager a réservé l'offre : il quitte la liste d'attente. */
export async function leaveAfterBooking(ctx: MutationCtx, menuItemId: Id<'menuItems'>, profileId: Id<'profiles'>) {
  const mine = (await entriesOf(ctx, menuItemId)).filter((e) => e.profileId === profileId)
  await Promise.all(mine.map((e) => ctx.db.delete(e._id)))
}
