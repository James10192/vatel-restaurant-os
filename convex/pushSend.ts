'use node'
import webpush from 'web-push'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'
import {
  NOTIFICATIONS,
  notificationKindValidator,
  pushTargetValidator,
} from './lib/notifications'

type Subscription = { endpoint: string; p256dh: string; auth: string }

/** Douze heures : un « menus publiés » plus vieux n'a plus d'intérêt. */
const TTL_SECONDS = 12 * 60 * 60

/**
 * Envoi Web Push (VAPID). Variables Convex : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, et VAPID_SUBJECT
 * (`mailto:` ou URL https ; à défaut SITE_URL). Sans elles, rien n'est envoyé et l'action le signale.
 */
export const deliver = internalAction({
  args: { target: pushTargetValidator, kind: notificationKindValidator },
  returns: v.object({ sent: v.number(), removed: v.number() }),
  // Types explicites : l'action lit `internal.push`, qui dépend lui-même de cette API (référence circulaire).
  handler: async (
    ctx,
    { target, kind },
  ): Promise<{ sent: number; removed: number }> => {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
    const subject = process.env.VAPID_SUBJECT ?? process.env.SITE_URL
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !subject) {
      console.warn(
        'Notifications push non configurées : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.',
      )
      return { sent: 0, removed: 0 }
    }
    const vapidDetails = {
      subject,
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    }
    const payload = JSON.stringify(NOTIFICATIONS[kind])
    const subscriptions: Array<Subscription> = await ctx.runQuery(
      internal.push.recipients,
      { target, kind },
    )

    const results = await Promise.allSettled(
      subscriptions.map(({ endpoint, p256dh, auth }) =>
        webpush.sendNotification(
          { endpoint, keys: { p256dh, auth } },
          payload,
          { vapidDetails, TTL: TTL_SECONDS },
        ),
      ),
    )
    const gone = subscriptions.filter((_, index) => {
      const result = results[index]
      return (
        result.status === 'rejected' &&
        result.reason instanceof webpush.WebPushError &&
        [404, 410].includes(result.reason.statusCode)
      )
    })
    await Promise.all(
      gone.map(({ endpoint }) =>
        ctx.runMutation(internal.push.removeGone, { endpoint }),
      ),
    )
    return {
      sent: results.filter((result) => result.status === 'fulfilled').length,
      removed: gone.length,
    }
  },
})
