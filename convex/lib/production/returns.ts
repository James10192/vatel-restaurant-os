import { v } from 'convex/values'
import { serviceValidator } from '../../schema'

const count = v.number()

export const productionDayReturns = v.object({
  offers: v.array(
    v.object({
      menuItemId: v.id('menuItems'),
      service: serviceValidator,
      dishName: v.string(),
      capacity: count,
      confirmed: count,
      pickedUp: count,
      cancelled: count,
      /** Null : jamais saisi en cuisine (« Préparé inconnu »), jamais remplacé par zéro. */
      prepared: v.union(v.null(), count),
      preparedAt: v.union(v.null(), v.number()),
      waste: v.object({ surplus: count, not_picked_up: count, kitchen: count, quality: count }),
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
    }),
  ),
})

export const wasteWeekReturns = v.array(v.object({ date: v.string(), prepared: count, served: count, wasted: count }))
