import { ConvexError } from 'convex/values'
import type { Infer } from 'convex/values'
import type { Doc } from '../_generated/dataModel'
import type { policyValidator, serviceValidator } from '../schema'

export type Policy = Infer<typeof policyValidator>
type Service = Infer<typeof serviceValidator>

/** Valeurs par défaut documentées (docs/DESIGN.md), remplaçables par établissement via `canteens.policy`. */
export const DEFAULT_POLICY: Policy = {
  serviceStart: { lunch: '12:00', dinner: '19:00' },
  cutoffMinutes: 120,
  demoTopUpMaxXof: 50_000,
}

export const policyOf = (canteen: Doc<'canteens'>): Policy => canteen.policy ?? DEFAULT_POLICY

/** Solde maximal d'un porte-monnaie de démonstration, toutes recharges confondues (#16, F1). */
export const DEMO_BALANCE_MAX_XOF = 100_000

/** Instant (ms) au-delà duquel on ne peut plus réserver ni annuler ce service. Abidjan = UTC+0. */
export function cutoffAt(policy: Policy, date: string, service: Service): number {
  const at = Date.parse(`${date}T${policy.serviceStart[service]}:00Z`) - policy.cutoffMinutes * 60_000
  // Horaire ou délai invalide : NaN rendrait toute comparaison fausse, donc la réservation toujours ouverte.
  if (!Number.isFinite(at)) throw new ConvexError('Horaires de service mal configurés pour cet établissement.')
  return at
}
