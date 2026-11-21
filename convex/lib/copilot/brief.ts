/**
 * Copilote cuisine (#9) : points d'attention calculés SANS IA à partir des chiffres de production.
 * C'est la réponse de référence (et le repli) ; l'IA peut seulement ordonner ces points et les résumer.
 * Chaque point porte un modèle de phrase et ses valeurs : l'interface le traduit, rien n'est inventé.
 */
import { roundQty, situationOf } from '../production/plan'
import { wasteBalance } from '../production/waste'
import type { ProductionDayOffer, WasteDay } from '../production/load'

export const POINT_KINDS = [
  'prepared_unknown',
  'surplus',
  'missing',
  'capacity_tight',
  'waste_high',
  'no_recipe',
  'week_waste',
  'stock_shortage',
  'lot_expiring',
  'tomorrow_target',
  'menu_improve',
] as const
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
export const THRESHOLDS = { capacityTightPct: 90, wasteHighPct: 10, menuRatingLow: 3.5, menuWasteHighPct: 15, minRatings: 3, minPrepared: 30 } as const

const MESSAGES: Record<PointKind, string> = {
  prepared_unknown: '{dish} : aucune portion préparée saisie, le reste à préparer est inconnu.',
  surplus: '{dish} : {n} portions prêtes au-delà des réservations, suspendre et faire vérifier la conservation.',
  missing: '{dish} : {n} portions restent à préparer.',
  capacity_tight: '{dish} : {booked} réservations sur {capacity} places.',
  waste_high: '{dish} : {rate} % du préparé déclaré perdu.',
  no_recipe: '{dish} : sans fiche technique, la matière à sortir est inconnue.',
  week_waste: '7 derniers jours : {wasted} portions perdues sur {prepared} préparées ({rate} %).',
  stock_shortage: '{name} : il manque {qty} {unit} pour la production prévue d’ici dimanche.',
  lot_expiring: '{name} : {qty} {unit} à utiliser avant le {day}',
  tomorrow_target: 'Demain, {dish} : {booked} réservés ; objectif proposé {target} ({walkIns} passages, {margin} de marge), à valider.',
  menu_improve: '{dish} : note {rating} sur 5 et {waste} % de pertes sur 30 jours, à revoir.',
}
const SEVERITY: Record<PointKind, Severity> = {
  prepared_unknown: 'action',
  surplus: 'action',
  missing: 'action',
  capacity_tight: 'watch',
  waste_high: 'watch',
  no_recipe: 'info',
  week_waste: 'info',
  stock_shortage: 'action',
  lot_expiring: 'watch',
  tomorrow_target: 'action',
  menu_improve: 'info',
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
    const { wasteRate } = wasteBalance(offer)
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
  return sortPoints(points)
}

/** Faits « gestion » déjà calculés par le serveur (stock, demain, 30 jours) : rien n'est estimé ici. */
export type ManagerFacts = {
  stock: Array<{ name: string; unit: string; shortage: number; expiring: Array<{ qty: number; day: string }> }>
  tomorrow: Array<{ menuItemId: string; dish: string; booked: number; hasPlan: boolean; walkIns: number; margin: number }>
  menus: Array<{ dish: string; ratingAvg: number | null; ratingCount: number; wasteRate: number | null; prepared: number }>
}

/**
 * Points de gestion : ruptures et dates limites (stock), objectifs proposés pour demain (offres sans plan validé),
 * menus à revoir (note basse ou pertes élevées, avec un minimum de données pour ne rien conclure sur un cas isolé).
 */
export function managerPoints({ stock, tomorrow, menus }: ManagerFacts): Array<Point> {
  return [
    ...stock.filter((s) => s.shortage > 0).map((s) => point('stock_shortage', s.name, { name: s.name, qty: roundQty(s.shortage), unit: s.unit })),
    ...stock.flatMap((s) => s.expiring.map((lot) => point('lot_expiring', `${s.name}:${lot.day}`, { name: s.name, qty: roundQty(lot.qty), unit: s.unit, day: lot.day }))),
    ...tomorrow
      .filter((o) => !o.hasPlan)
      .map((o) =>
        point('tomorrow_target', o.menuItemId, { dish: o.dish, booked: o.booked, walkIns: o.walkIns, margin: o.margin, target: o.booked + o.walkIns + o.margin, menuItemId: o.menuItemId }),
      ),
    ...menus
      .filter(
        (m) =>
          (m.ratingCount >= THRESHOLDS.minRatings && (m.ratingAvg ?? 5) < THRESHOLDS.menuRatingLow) ||
          (m.prepared >= THRESHOLDS.minPrepared && (m.wasteRate ?? 0) >= THRESHOLDS.menuWasteHighPct),
      )
      .map((m) => point('menu_improve', m.dish, { dish: m.dish, rating: m.ratingAvg ?? '?', waste: m.wasteRate ?? '?' })),
  ]
}

const ORDER: Record<Severity, number> = { action: 0, watch: 1, info: 2 }
/** Tous les points, triés : à faire, à surveiller, information. */
export const sortPoints = (points: Array<Point>) => [...points].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
