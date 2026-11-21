import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireMember } from './lib/access'
import {
  CATEGORY_OF,
  MAX_DEVICES_PER_MEMBER,
  isAllowedPushEndpoint,
  isPushKey,
  notificationKindValidator,
    pushTargetValidator,
} from './lib/notifications'
import { withoutMuted } from './notificationPreferences'
import { localeValidator } from './lib/locale'

/**
 * Notifications push : un appareil s'abonne pour le membre connecté. L'envoi réel se fait dans
 * `pushSend.ts` (runtime Node, bibliothèque web-push) ; la clé privée VAPID ne quitte jamais Convex.
 */

const byEndpoint = (ctx: QueryCtx, endpoint: string) =>
  ctx.db
    .query('pushSubscriptions')
    .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
    .unique()

/** Appareils abonnés d'un membre (au plus MAX_DEVICES_PER_MEMBER). */
export const devicesOf = (ctx: QueryCtx, profileId: Id<'profiles'>) =>
  ctx.db
    .query('pushSubscriptions')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .take(MAX_DEVICES_PER_MEMBER)

/** Clé publique VAPID (non secrète) ; null tant que l'environnement Convex n'est pas configuré. */
export const publicKey = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    await requireMember(ctx)
    return process.env.VAPID_PUBLIC_KEY ?? null
  },
})

/** Enregistre (ou réattribue au membre connecté) l'abonnement de cet appareil. Idempotent. */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    locale: v.optional(localeValidator),
  },
  returns: v.null(),
  handler: async (ctx, subscription) => {
    const { _id: profileId, canteenId } = await requireMember(ctx)
    if (
      !isAllowedPushEndpoint(subscription.endpoint) ||
      !isPushKey(subscription.p256dh) ||
      !isPushKey(subscription.auth)
    ) {
      throw new ConvexError('Abonnement aux notifications invalide.')
    }
    const existing = await byEndpoint(ctx, subscription.endpoint)
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...subscription,
        profileId,
        canteenId,
      })
      return null
    }
    const devices = await devicesOf(ctx, profileId)
    if (devices.length >= MAX_DEVICES_PER_MEMBER) {
      throw new ConvexError(
        `Notifications déjà actives sur ${MAX_DEVICES_PER_MEMBER} appareils. Désactivez-en un d’abord.`,
      )
    }
    await ctx.db.insert('pushSubscriptions', {
      ...subscription,
      profileId,
      canteenId,
    })
    return null
  },
})

/** Retire l'abonnement de cet appareil, seulement s'il appartient au membre connecté. Idempotent. */
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const { _id: profileId } = await requireMember(ctx)
    const existing = await byEndpoint(ctx, endpoint)
    if (existing?.profileId === profileId) await ctx.db.delete(existing._id)
    return null
  },
})

/** Demande l'envoi d'une notification de test aux appareils du membre. Renvoie le nombre d'appareils visés. */
export const sendTest = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { _id: profileId } = await requireMember(ctx)
    const devices = await devicesOf(ctx, profileId)
    if (devices.length === 0)
      throw new ConvexError(
        'Aucun appareil abonné. Activez d’abord les notifications.',
      )
    await ctx.scheduler.runAfter(0, internal.pushSend.deliver, {
      target: { profileId },
      kind: 'test',
    })
    return devices.length
  },
})

/** Abonnements visés par un envoi (lecture interne, jamais exposée au client). */
export const recipients = internalQuery({
  args: { target: pushTargetValidator, kind: notificationKindValidator },
  returns: v.array(
    v.object({
      endpoint: v.string(),
      p256dh: v.string(),
      auth: v.string(),
      locale: v.optional(localeValidator),
    }),
  ),
  handler: async (ctx, { target, kind }) => {
    const candidates =
      'canteenId' in target
        ? await ctx.db
            .query('pushSubscriptions')
            .withIndex('by_canteen', (q) => q.eq('canteenId', target.canteenId))
            .take(2000)
        : (
            await Promise.all(
              ('profileId' in target
                ? [target.profileId]
                : target.profileIds
              ).map((profileId) => devicesOf(ctx, profileId)),
            )
          ).flat()
    const rows = await withoutMuted(ctx, candidates, CATEGORY_OF[kind])
    return rows.map(({ endpoint, p256dh, auth, locale }) => ({
      endpoint,
      p256dh,
      auth,
      locale,
    }))
  },
})

/** Le service push a répondu 404/410 : l'abonnement n'existe plus (désinstallation, déconnexion). */
export const removeGone = internalMutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const existing = await byEndpoint(ctx, endpoint)
    if (existing) await ctx.db.delete(existing._id)
    return null
  },
})
