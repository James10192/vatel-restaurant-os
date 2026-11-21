/**
 * Tableau de bord (#9) : indicateurs d'une période (7 ou 30 jours) d'un établissement, administration seulement.
 * Cinq lectures par plage de dates indexée, puis calcul pur (convex/lib/analytics.ts).
 */
import { ConvexError, v } from 'convex/values'
import { query } from './_generated/server'
import { requireAdmin } from './lib/access'
import { dayRow, totals } from './lib/analytics'
import { addDays, todayUtc } from './lib/dates'
import { assertIsoDate } from './lib/validation'

const n = v.number()
const rateValidator = v.object({ value: v.union(v.null(), n), numerator: n, denominator: n })

const rowValidator = v.object({
  date: v.string(),
  past: v.boolean(),
  offers: n,
  capacity: n,
  booked: n,
  pickedUp: n,
  noShow: n,
  cancelled: n,
  walkIns: n,
  prepared: v.union(v.null(), n),
  wasted: n,
  recovered: n,
  demoCreditsXof: n,
  soldOut: n,
  ratingSum: n,
  ratingCount: n,
  planError: n,
  plannedOffers: n,
})

export const period = query({
  args: { endDate: v.string(), days: v.number() },
  returns: v.object({
    rows: v.array(rowValidator),
    totals: v.object({
      booked: n,
      walkIns: n,
      demoCreditsXof: n,
      soldOut: n,
      offers: n,
      pickupRate: rateValidator,
      noShowRate: rateValidator,
      cancelRate: rateValidator,
      wasteRate: rateValidator,
      recoveredRate: rateValidator,
      rating: v.object({ value: v.union(v.null(), n), count: n }),
      planError: v.object({ value: v.union(v.null(), n), services: n }),
    }),
  }),
  handler: async (ctx, { endDate, days }) => {
    const { canteenId } = await requireAdmin(ctx)
    if (days !== 7 && days !== 30) throw new ConvexError('Période : 7 ou 30 jours.')
    const end = assertIsoDate(endDate)
    const start = addDays(end, -(days - 1))
    const [items, bookings, events, plans, ratings] = await Promise.all([
      ctx.db.query('menuItems').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
      ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
      ctx.db.query('productionEvents').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
      ctx.db.query('productionPlans').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
      ctx.db.query('ratings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
    ])
    const today = todayUtc()
    const rows = Array.from({ length: days }, (_, i) => addDays(start, i)).map((date) => {
      const ofDay = bookings.filter((b) => b.date === date)
      const offers = items
        .filter((item) => item.date === date && item.status === 'published')
        .map((item) => {
          const mine = ofDay.filter((b) => b.menuItemId === item._id)
          const active = mine.filter((b) => b.status !== 'cancelled').length
          const walkIns = events.filter((e) => e.menuItemId === item._id && e.kind === 'walkin').length
          const plan = plans.filter((p) => p.menuItemId === item._id).sort((a, b) => b._creationTime - a._creationTime).at(0)
          return {
            capacity: item.capacity,
            active,
            // Objectif rapporté aux réservations finales : mesure la qualité des hypothèses (passages, marge).
            target: plan ? active + plan.walkIns + plan.margin : null,
            served: mine.filter((b) => b.status === 'picked_up').length + walkIns,
          }
        })
      return dayRow({ date, offers, bookings: ofDay, events: events.filter((e) => e.date === date), scores: ratings.filter((r) => r.date === date).map((r) => r.score) }, today)
    })
    return { rows, totals: totals(rows) }
  },
})
