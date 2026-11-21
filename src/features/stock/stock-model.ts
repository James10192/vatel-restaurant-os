import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { addDays } from '../../../convex/lib/dates'
import { roundQty } from '../../../convex/lib/production/plan'
import { expiringLots, toBuy } from '../../../convex/lib/stock/position'

export type StockRow = FunctionReturnType<typeof api.stock.overview>[number]

/** Alerte d'une ligne de stock : rupture prévue d'ici dimanche, lots qui expirent sous 2 jours, unités sans conversion. */
export function alertsOf(row: StockRow, today: string) {
  return {
    shortage: row.need !== null && row.need > row.theoretical ? row.need - row.theoretical : 0,
    expiring: expiringLots(row, today, addDays(today, 2)),
    incompatible: row.incompatible,
  }
}

/** Liste d'achat : besoin d'ici dimanche moins stock théorique, avec dernier fournisseur et coût estimé si un prix est connu. */
export function purchaseList(rows: Array<StockRow>) {
  return rows
    .filter((row) => row.need !== null && toBuy(row.need, row) > 0)
    .map((row) => {
      const quantity = toBuy(row.need ?? 0, row)
      const price = row.avgUnitCostXof
      return { name: row.name, quantity, unit: row.unit, supplier: row.lastSupplier, costXof: price === null ? null : Math.round(quantity * price) }
    })
}

/** Export tableur (séparateur « ; » lu par Excel en français), texte échappé. */
export function purchaseCsv(list: ReturnType<typeof purchaseList>) {
  const cell = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = [['Ingrédient', 'Quantité', 'Unité', 'Fournisseur', 'Coût estimé (FCFA)'], ...list.map((p) => [p.name, roundQty(p.quantity), p.unit, p.supplier, p.costXof])]
  return lines.map((line) => line.map(cell).join(';')).join('\r\n')
}
