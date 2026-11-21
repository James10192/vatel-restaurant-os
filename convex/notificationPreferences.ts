import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { requireMember } from './lib/access'
import {
  NOTIFICATION_CATEGORIES,
  notificationCategoryValidator,
} from './lib/notifications'
import type { NotificationCategory } from './lib/notifications'

/** Choix du type de notifications, par membre (vaut pour tous ses appareils). Absent = tout est reçu. */

const preferencesOf = (ctx: QueryCtx, profileId: Id<'profiles'>) =>
  ctx.db
    .query('notificationPreferences')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .unique()

const enabledReturns = v.object({
  menuPublished: v.boolean(),
  bookingReminder: v.boolean(),
  lowBalance: v.boolean(),
})

export const mine = query({
  args: {},
  returns: enabledReturns,
  handler: async (ctx) => {
    const { _id } = await requireMember(ctx)
    const muted = new Set((await preferencesOf(ctx, _id))?.muted ?? [])
    return {
      menuPublished: !muted.has('menuPublished'),
      bookingReminder: !muted.has('bookingReminder'),
      lowBalance: !muted.has('lowBalance'),
    }
  },
})

/** Active ou coupe une famille pour le membre connecté. Idempotent. */
export const set = mutation({
  args: { category: notificationCategoryValidator, enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { category, enabled }) => {
    const { _id: profileId } = await requireMember(ctx)
    const existing = await preferencesOf(ctx, profileId)
    const muted = new Set<NotificationCategory>(existing?.muted ?? [])
    if (enabled) muted.delete(category)
    else muted.add(category)
    // Ordre canonique : la même préférence s'écrit toujours de la même façon.
    const next = NOTIFICATION_CATEGORIES.filter((c) => muted.has(c))
    if (existing) await ctx.db.patch(existing._id, { muted: next })
    else
      await ctx.db.insert('notificationPreferences', { profileId, muted: next })
    return null
  },
})

/** Retire les abonnements des membres qui ont coupé cette famille (`null` : notification non réglable). */
export async function withoutMuted(
  ctx: QueryCtx,
  subscriptions: Array<Doc<'pushSubscriptions'>>,
  category: NotificationCategory | null,
): Promise<Array<Doc<'pushSubscriptions'>>> {
  if (!category) return subscriptions
  const profileIds = [...new Set(subscriptions.map((s) => s.profileId))]
  const mutedBy = new Set<Id<'profiles'>>()
  for (const profileId of profileIds) {
    if ((await preferencesOf(ctx, profileId))?.muted.includes(category))
      mutedBy.add(profileId)
  }
  return subscriptions.filter((s) => !mutedBy.has(s.profileId))
}
