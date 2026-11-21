import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { activeBookingsCount } from './lib/capacity'
import { addDays } from './lib/dates'
import { REMINDER_LEAD_MINUTES } from './lib/notifications'
import { cutoffAt, policyOf } from './lib/policy'
import type { serviceValidator } from './schema'

type Service = Infer<typeof serviceValidator>

const SERVICES: Array<Service> = ['lunch', 'dinner']
const KIND = { lunch: 'lunchReminder', dinner: 'dinnerReminder' } as const

/**
 * Rappel « les réservations ferment bientôt », lancé toutes les 15 minutes (`crons.ts`).
 * Pour chaque établissement et service dont la clôture tombe dans l'heure : un seul rappel (table
 * `pushReminders`), seulement s'il reste des portions, et seulement aux membres abonnés qui n'ont pas
 * déjà réservé ce service. Abidjan = UTC+0 : la date du jour est la date UTC.
 */
export const sendDue = internalMutation({
  args: {},
  returns: v.object({ reminders: v.number() }),
  handler: async (ctx) => {
    const now = Date.now()
    const today = new Date(now).toISOString().slice(0, 10)
    let reminders = 0
    for (const canteen of await ctx.db.query('canteens').take(200)) {
      for (const date of [today, addDays(today, 1)]) {
        for (const service of SERVICES) {
          if (!(await isDue(ctx, canteen, date, service, now))) continue
          await ctx.db.insert('pushReminders', {
            canteenId: canteen._id,
            date,
            service,
          })
          const profileIds = await subscribersWithoutBooking(
            ctx,
            canteen._id,
            date,
            service,
          )
          if (profileIds.length > 0) {
            await ctx.scheduler.runAfter(0, internal.pushSend.deliver, {
              target: { profileIds },
              kind: KIND[service],
            })
          }
          reminders++
        }
      }
    }
    return { reminders }
  },
})

/** Clôture dans l'heure, rappel pas encore envoyé, au moins une offre publiée avec des portions restantes. */
async function isDue(
  ctx: QueryCtx,
  canteen: Doc<'canteens'>,
  date: string,
  service: Service,
  now: number,
) {
  let cutoff: number
  try {
    cutoff = cutoffAt(policyOf(canteen), date, service)
  } catch {
    return false // horaires mal configurés : aucune notification plutôt qu'une notification fausse
  }
  if (now < cutoff - REMINDER_LEAD_MINUTES * 60_000 || now >= cutoff)
    return false
  const sent = await ctx.db
    .query('pushReminders')
    .withIndex('by_canteen_date_service', (q) =>
      q.eq('canteenId', canteen._id).eq('date', date).eq('service', service),
    )
    .first()
  if (sent) return false
  const offers = (
    await ctx.db
      .query('menuItems')
      .withIndex('by_canteen_status_date', (q) =>
        q
          .eq('canteenId', canteen._id)
          .eq('status', 'published')
          .eq('date', date),
      )
      .collect()
  ).filter((item) => item.service === service)
  for (const offer of offers) {
    if ((await activeBookingsCount(ctx, offer._id)) < offer.capacity)
      return true
  }
  return false
}

/** Membres de l'établissement ayant au moins un appareil abonné et aucune réservation active pour ce service. */
async function subscribersWithoutBooking(
  ctx: QueryCtx,
  canteenId: Id<'canteens'>,
  date: string,
  service: Service,
): Promise<Array<Id<'profiles'>>> {
  const subscriptions = await ctx.db
    .query('pushSubscriptions')
    .withIndex('by_canteen', (q) => q.eq('canteenId', canteenId))
    .take(2000)
  const profileIds = [
    ...new Set(subscriptions.map((subscription) => subscription.profileId)),
  ]
  const booked = await Promise.all(
    profileIds.map(async (profileId) =>
      (
        await ctx.db
          .query('bookings')
          .withIndex('by_profile_date', (q) =>
            q.eq('profileId', profileId).eq('date', date),
          )
          .collect()
      ).some(
        (booking) =>
          booking.service === service && booking.status !== 'cancelled',
      ),
    ),
  )
  return profileIds.filter((_, index) => !booked[index])
}
