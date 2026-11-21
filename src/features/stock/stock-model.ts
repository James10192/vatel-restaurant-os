import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { addDays } from '../../../convex/lib/dates'
import { roundQty } from '../../../convex/lib/production/plan'
import { EXPIRY_HORIZON_DAYS, stockAlerts, toBuy } from '../../../convex/lib/stock/position'
import { csvRows } from '../../../convex/lib/csv'

export type StockRow = FunctionReturnType<typeof api.stock.overview>[number]

/** Alerte d'une ligne de stock : rupture prévue d'ici dimanche, lots qui expirent sous 2 jours, unités sans conversion. */
export const alertsOf = (row: StockRow, today: string) => stockAlerts(row, today, addDays(today, EXPIRY_HORIZON_DAYS))

/** Liste d'achat : besoin d'ici dimanche moins stock théorique, avec dernier fournisseur et coût estimé si un prix est connu. */
export function purchaseList(rows: Array<StockRow>) {
  return rows
    .map((row) => ({ row, quantity: row.need === null ? 0 : toBuy(row.need, row) }))
    .filter(({ quantity }) => quantity > 0)
    .map(({ row, quantity }) => {
      const price = row.avgUnitCostXof
      return { name: row.name, quantity, unit: row.unit, supplier: row.lastSupplier, costXof: price === null ? null : Math.round(quantity * price) }
    })
}

/** Export tableur (séparateur « ; » lu par Excel en français), texte échappé. */
export function purchaseCsv(list: ReturnType<typeof purchaseList>) {
  return csvRows([['Ingrédient', 'Quantité', 'Unité', 'Fournisseur', 'Coût estimé (FCFA)'], ...list.map((p) => [p.name, roundQty(p.quantity), p.unit, p.supplier, p.costXof])])
}
