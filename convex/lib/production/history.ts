/**
 * Historique d'un plat et estimation par règles (#5). Aucune « prévision » statistique : avec peu d'historique,
 * on le dit (démarrage à froid) et on propose une marge simple, que le chef valide ou corrige.
 */

export type PastService = {
  date: string
  booked: number
  pickedUp: number
  noShow: number
  cancelled: number
  prepared: number | null
  wasted: number
  /** Servis sans réservation, comptés au comptoir. */
  walkIns: number
}

export type DishHistory = {
  services: number
  avgBooked: number | null
  /** Moyenne des repas servis sans réservation : la base mesurée des « passages ». */
  avgWalkIns: number | null
  /** Parts en % entiers, sur les réservations actives des services passés ; null sans historique. */
  pickupRate: number | null
  noShowRate: number | null
  cancelRate: number | null
  wasteRate: number | null
}

export type Suggestion = {
  /** Démarrage à froid : moins de MIN_HISTORY services passés, règles par défaut seulement. */
  coldStart: boolean
  margin: number
  /** Passages sans réservation proposés : moyenne observée, 0 au démarrage à froid. */
  walkIns: number
  /** Absences attendues d'après l'historique : l'incertitude basse de la demande. */
  expectedNoShows: number
}

export const MIN_HISTORY = 3
/** Marge par défaut : 5 % des réservations, arrondie au-dessus (modifiable par le chef à la validation). */
export const DEFAULT_MARGIN_PCT = 5

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null)
const sum = (rows: Array<PastService>, key: 'booked' | 'pickedUp' | 'noShow' | 'cancelled' | 'wasted' | 'walkIns') => rows.reduce((n, r) => n + r[key], 0)

export function summarizeHistory(rows: Array<PastService>): DishHistory {
  const booked = sum(rows, 'booked')
  const measured = rows.filter((r) => r.prepared !== null)
  const prepared = measured.reduce((n, r) => n + (r.prepared ?? 0), 0)
  return {
    services: rows.length,
    avgBooked: rows.length ? Math.round(booked / rows.length) : null,
    avgWalkIns: rows.length ? Math.round(sum(rows, 'walkIns') / rows.length) : null,
    pickupRate: pct(sum(rows, 'pickedUp'), booked),
    noShowRate: pct(sum(rows, 'noShow'), booked),
    cancelRate: pct(sum(rows, 'cancelled'), booked + sum(rows, 'cancelled')),
    wasteRate: pct(sum(measured, 'wasted'), prepared),
  }
}

/** Proposition de marge et incertitude pour `booked` réservations actuelles. */
export function suggest(history: DishHistory, booked: number): Suggestion {
  const coldStart = history.services < MIN_HISTORY
  return {
    coldStart,
    margin: Math.ceil((booked * DEFAULT_MARGIN_PCT) / 100),
    walkIns: coldStart ? 0 : (history.avgWalkIns ?? 0),
    expectedNoShows: coldStart || history.noShowRate === null ? 0 : Math.round((booked * history.noShowRate) / 100),
  }
}
