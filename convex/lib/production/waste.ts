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

export type WasteBalance = {
  prepared: number | null
  served: number
  wasted: number
  /** Portions préparées encore attendues par des réservations non retirées. Null si P inconnu. */
  pending: number | null
  /** Préparé moins remis, perdu et attendu : ni servi ni déclaré, à expliquer. Null si P inconnu. */
  unexplained: number | null
  /** Remis plus que préparé : saisie de production incomplète. */
  servedExceedsPrepared: boolean
  /** Part perdue du préparé, en % entier. Null si P inconnu ou nul. */
  wasteRate: number | null
}

export function wasteBalance(prepared: number | null, served: number, awaiting: number, waste: WasteByReason): WasteBalance {
  const wasted = WASTE_REASONS.reduce((sum, reason) => sum + waste[reason], 0)
  const left = prepared === null ? null : Math.max(0, prepared - served - wasted)
  const pending = left === null ? null : Math.min(left, awaiting)
  return {
    prepared,
    served,
    wasted,
    pending,
    unexplained: left === null ? null : left - (pending ?? 0),
    servedExceedsPrepared: prepared !== null && served > prepared,
    wasteRate: prepared ? Math.round((wasted / prepared) * 100) : null,
  }
}

/** Nouvelle perte acceptable : au plus ce qui a été préparé et n'a été ni remis ni déjà déclaré perdu. */
export const maxDeclarableWaste = (prepared: number, served: number, wasted: number) => Math.max(0, prepared - served - wasted)
