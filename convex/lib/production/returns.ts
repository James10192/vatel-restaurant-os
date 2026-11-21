import { v } from 'convex/values'
import { serviceValidator } from '../../schema'

const count = v.number()

const offerValidator = v.object({
  menuItemId: v.id('menuItems'),
  service: serviceValidator,
  dishName: v.string(),
  capacity: count,
  confirmed: count,
  pickedUp: count,
  cancelled: count,
  /** Réservations confirmées jamais retirées, sur un jour passé (absences). */
  noShow: count,
  /** Null : jamais saisi en cuisine (« Préparé inconnu »), jamais remplacé par zéro. */
  prepared: v.union(v.null(), count),
  preparedAt: v.union(v.null(), v.number()),
  waste: v.object({
    surplus: count,
    not_picked_up: count,
    kitchen: count,
    quality: count,
  }),
  lots: v.array(
    v.object({ at: v.number(), portions: v.number(), by: v.string() }),
  ),
  plan: v.union(
    v.null(),
    v.object({
      walkIns: count,
      margin: count,
      bookedAtValidation: count,
      at: v.number(),
      by: v.string(),
      revisions: count,
    }),
  ),
  recipe: v.union(
    v.null(),
    v.object({
      portions: count,
      lines: v.array(
        v.object({
          ingredientId: v.string(),
          name: v.string(),
          unitId: v.string(),
          unit: v.string(),
          quantity: v.number(),
          lossPct: v.number(),
        }),
      ),
    }),
  ),
})

export const productionDayReturns = v.object({
  offers: v.array(offerValidator),
})

export const productionWeekReturns = v.array(
  v.object({ date: v.string(), offers: v.array(offerValidator) }),
)

export const wasteWeekReturns = v.array(
  v.object({ date: v.string(), prepared: count, served: count, wasted: count }),
)

const rate = v.union(v.null(), count)

export const dishHistoryReturns = v.object({
  history: v.object({
    services: count,
    avgBooked: rate,
    pickupRate: rate,
    noShowRate: rate,
    cancelRate: rate,
    wasteRate: rate,
  }),
  suggestion: v.object({ coldStart: v.boolean(), margin: count, expectedNoShows: count }),
  services: v.array(
    v.object({ date: v.string(), booked: count, pickedUp: count, noShow: count, cancelled: count, prepared: v.union(v.null(), count), wasted: count }),
  ),
})
