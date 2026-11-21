import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import type { Baseline } from '../../../convex/lib/production/plan'

export type ProductionOffer = FunctionReturnType<typeof api.production.day>['offers'][number]

export const baselineOf = (offer: ProductionOffer): Baseline => ({
  capacity: offer.capacity,
  confirmed: offer.confirmed,
  pickedUp: offer.pickedUp,
  prepared: offer.prepared,
})

