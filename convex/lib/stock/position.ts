/**
 * Position de stock d'un ingrédient (#6), calcul pur et explicable :
 *   théorique = dernier inventaire (ou 0) + réceptions depuis - consommation des fiches depuis - pertes depuis
 * La consommation vient des portions préparées multipliées par la fiche technique (brut) : c'est une estimation,
 * corrigée à chaque inventaire, dont l'écart est conservé. Les lots restants suivent l'hypothèse « premier
 * entré, premier sorti » : on suppose consommés d'abord les plus anciens.
 */
import { convert } from './units'

export type Reception = { at: number; quantity: number; unit: string; lotCode?: string; expiresOn?: string; supplier?: string; unitCostXof?: number }
export type Count = { at: number; quantity: number; unit: string }
export type Outflow = { at: number; quantity: number; unit: string }

export type Position = {
  /** Unité d'affichage : celle du dernier inventaire, sinon de la dernière réception, sinon de la fiche. */
  unit: string
  theoretical: number
  lastCount: { at: number; quantity: number } | null
  /** Sorties dont l'unité ne se convertit pas dans l'unité du stock : ignorées, et signalées. */
  incompatible: Array<string>
  lots: Array<{ lotCode?: string; expiresOn?: string; remaining: number }>
  /** Coût moyen pondéré des réceptions qui ont un prix (FCFA par unité de stock), sinon null. */
  avgUnitCostXof: number | null
}

export function positionOf(unitHint: string, receptions: Array<Reception>, counts: Array<Count>, outflows: Array<Outflow>): Position {
  const last = [...counts].sort((a, b) => b.at - a.at).at(0)
  const unit = last?.unit ?? [...receptions].sort((a, b) => b.at - a.at).at(0)?.unit ?? unitHint
  const incompatible = new Set<string>()
  const inUnit = (quantity: number, from: string) => {
    const value = convert(quantity, from, unit)
    if (value === null) incompatible.add(from)
    return value ?? 0
  }
  const since = (at: number) => !last || at > last.at
  const start = last ? inUnit(last.quantity, last.unit) : 0
  const received = receptions.filter((r) => since(r.at))
  const inflow = received.reduce((n, r) => n + inUnit(r.quantity, r.unit), 0)
  const outflow = outflows.filter((o) => since(o.at)).reduce((n, o) => n + inUnit(o.quantity, o.unit), 0)
  const theoretical = Math.max(0, start + inflow - outflow)
  return {
    unit,
    theoretical,
    lastCount: last ? { at: last.at, quantity: start } : null,
    incompatible: [...incompatible],
    lots: remainingLots(receptions, theoretical, inUnit),
    avgUnitCostXof: averageCost(receptions, inUnit),
  }
}

/** Lots encore en stock (FIFO) : le stock restant est attribué aux réceptions les plus récentes. */
function remainingLots(receptions: Array<Reception>, stock: number, inUnit: (q: number, u: string) => number) {
  let left = stock
  const lots: Position['lots'] = []
  for (const r of [...receptions].sort((a, b) => b.at - a.at)) {
    if (left <= 0) break
    const take = Math.min(left, inUnit(r.quantity, r.unit))
    if (take > 0) lots.push({ lotCode: r.lotCode, expiresOn: r.expiresOn, remaining: take })
    left -= take
  }
  return lots
}

function averageCost(receptions: Array<Reception>, inUnit: (q: number, u: string) => number) {
  const priced = receptions.filter((r) => r.unitCostXof !== undefined)
  const quantity = priced.reduce((n, r) => n + inUnit(r.quantity, r.unit), 0)
  if (quantity <= 0) return null
  // Prix saisi par unité de réception : converti en prix par unité de stock.
  const total = priced.reduce((n, r) => n + (r.unitCostXof ?? 0) * r.quantity, 0)
  return total / quantity
}

/** Lots qui expirent d'ici `days` jours (inclus) et encore en stock. */
export const expiringLots = (position: Position, today: string, horizon: string) =>
  position.lots.filter((lot) => lot.expiresOn !== undefined && lot.expiresOn <= horizon && lot.remaining > 0).map((lot) => ({ ...lot, expired: (lot.expiresOn ?? '') < today }))

/** Besoin à acheter : besoin restant moins stock théorique, jamais négatif. */
export const toBuy = (need: number, position: Position) => Math.max(0, need - position.theoretical)
