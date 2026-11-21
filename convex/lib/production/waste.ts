/**
 * Smart Waste (#6) : le réel, distinct de la simulation (#5). Portions préparées, remises, perdues avec motif.
 * Une perte déclarée n'est jamais une économie : seules les mesures saisies en cuisine sont comptées.
 */

export const WASTE_REASONS = ['surplus', 'not_picked_up', 'kitchen', 'quality'] as const
export type WasteReason = (typeof WASTE_REASONS)[number]

export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  surplus: 'Surplus non servi',
  not_picked_up: 'Réservé non retiré',
  kitchen: 'Incident en cuisine',
  quality: 'Retrait qualité ou hygiène',
}

export const MAX_EVENT_PORTIONS = 1_000

export type WasteByReason = Record<WasteReason, number>
export const emptyWaste = (): WasteByReason => ({ surplus: 0, not_picked_up: 0, kitchen: 0, quality: 0 })

/** Ce que le bilan lit d'une offre : exactement les champs renvoyés par production.day. */
export type WasteInput = { prepared: number | null; pickedUp: number; confirmed: number; waste: WasteByReason; recovered: number }

export type WasteBalance = {
  prepared: number | null
  served: number
  wasted: number
  /** Surplus sûr redistribué après contrôle hygiène du chef : ni perte, ni vente. */
  recovered: number
  /** Portions préparées encore attendues par des réservations non retirées. Null si P inconnu. */
  pending: number | null
  /** Préparé moins remis, perdu, récupéré et attendu : à expliquer. Null si P inconnu. */
  unexplained: number | null
  /** Remis plus que préparé : saisie de production incomplète. */
  servedExceedsPrepared: boolean
  /** Part perdue du préparé, en % entier. Null si P inconnu ou nul. */
  wasteRate: number | null
}

export function wasteBalance({ prepared, pickedUp: served, confirmed, waste, recovered }: WasteInput): WasteBalance {
  const wasted = WASTE_REASONS.reduce((sum, reason) => sum + waste[reason], 0)
  const left = prepared === null ? null : Math.max(0, prepared - served - wasted - recovered)
  const pending = left === null ? null : Math.min(left, confirmed)
  return {
    prepared,
    served,
    wasted,
    recovered,
    pending,
    unexplained: left === null ? null : left - (pending ?? 0),
    servedExceedsPrepared: prepared !== null && served > prepared,
    wasteRate: prepared ? Math.round((wasted / prepared) * 100) : null,
  }
}

/** Portions encore déclarables (perte ou récupération) : préparé moins remis, perdu et déjà récupéré. */
export const maxDeclarable = (prepared: number, served: number, wastedOrRecovered: number) => Math.max(0, prepared - served - wastedOrRecovered)
