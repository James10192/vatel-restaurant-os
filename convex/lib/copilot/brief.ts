/**
 * Copilote cuisine (#9) : points d'attention calculés SANS IA à partir des chiffres de production.
 * C'est la réponse de référence (et le repli) ; l'IA peut seulement ordonner ces points et les résumer.
 * Chaque point porte un modèle de phrase et ses valeurs : l'interface le traduit, rien n'est inventé.
 */
import { situationOf } from '../production/plan'
import { wasteBalance } from '../production/waste'
import type { ProductionDayOffer, WasteDay } from '../production/load'

export const POINT_KINDS = ['prepared_unknown', 'surplus', 'missing', 'capacity_tight', 'waste_high', 'no_recipe', 'week_waste'] as const
export type PointKind = (typeof POINT_KINDS)[number]
export type Severity = 'action' | 'watch' | 'info'

export type Point = {
  id: string
  kind: PointKind
  severity: Severity
  /** Modèle de phrase (clé de traduction) et valeurs ; `dish` est un nom saisi par l'établissement. */
  message: string
  values: Record<string, string | number>
}

/** Seuils lisibles et modifiables en un seul endroit (pas de règle cachée dans le code d'affichage). */
export const THRESHOLDS = { capacityTightPct: 90, wasteHighPct: 10 } as const

const MESSAGES: Record<PointKind, string> = {
  prepared_unknown: '{dish} : aucune portion préparée saisie, le reste à préparer est inconnu.',
  surplus: '{dish} : {n} portions prêtes au-delà des réservations, suspendre et faire vérifier la conservation.',
  missing: '{dish} : {n} portions restent à préparer.',
  capacity_tight: '{dish} : {booked} réservations sur {capacity} places.',
  waste_high: '{dish} : {rate} % du préparé déclaré perdu.',
  no_recipe: '{dish} : sans fiche technique, la matière à sortir est inconnue.',
  week_waste: '7 derniers jours : {wasted} portions perdues sur {prepared} préparées ({rate} %).',
}
const SEVERITY: Record<PointKind, Severity> = {
  prepared_unknown: 'action',
  surplus: 'action',
  missing: 'action',
  capacity_tight: 'watch',
  waste_high: 'watch',
  no_recipe: 'info',
  week_waste: 'info',
}

const point = (kind: PointKind, key: string, values: Point['values']): Point => ({
  id: `${kind}:${key}`,
  kind,
  severity: SEVERITY[kind],
  message: MESSAGES[kind],
  values,
})

const pct = (part: number, whole: number) => Math.round((part / whole) * 100)

/** Points d'attention d'un jour, triés : à faire d'abord, puis à surveiller, puis informations. */
export function buildPoints(offers: Array<ProductionDayOffer>, week: Array<WasteDay>): Array<Point> {
  const points = offers.flatMap((offer) => {
    const dish = offer.dishName
    const key = offer.menuItemId
    const situation = situationOf(offer, offer.plan)
    const booked = offer.confirmed + offer.pickedUp
    const { wasteRate } = wasteBalance(offer.prepared, offer.pickedUp, offer.confirmed, offer.waste)
    return [
      situation === null && point('prepared_unknown', key, { dish }),
      situation && situation.surplus > 0 && point('surplus', key, { dish, n: situation.surplus }),
      situation && situation.missing > 0 && point('missing', key, { dish, n: situation.missing }),
      offer.capacity > 0 && pct(booked, offer.capacity) >= THRESHOLDS.capacityTightPct && point('capacity_tight', key, { dish, booked, capacity: offer.capacity }),
      wasteRate !== null && wasteRate >= THRESHOLDS.wasteHighPct && point('waste_high', key, { dish, rate: wasteRate }),
      offer.recipe === null && point('no_recipe', key, { dish }),
    ].filter((p): p is Point => p !== false && p !== null)
  })
  const prepared = week.reduce((n, d) => n + d.prepared, 0)
  const wasted = week.reduce((n, d) => n + d.wasted, 0)
  if (prepared > 0) points.push(point('week_waste', 'week', { wasted, prepared, rate: pct(wasted, prepared) }))
  const order: Record<Severity, number> = { action: 0, watch: 1, info: 2 }
  return points.sort((a, b) => order[a.severity] - order[b.severity])
}
