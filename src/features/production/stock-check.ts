import type { MaterialNeed } from '../../../convex/lib/production/plan'
import { convert } from '../../../convex/lib/stock/units'
import type { StockRow } from '../stock/stock-model'

export type StockCheck = {
  /** Ingrédients sans stock suivi, ou dont l'unité ne se convertit pas : inconnus, jamais supposés disponibles. */
  unknown: Array<string>
  /** Ingrédients dont le stock théorique ne couvre pas la quantité. */
  short: Array<string>
  /** Coût matière estimé (FCFA), seulement si chaque ingrédient a un prix reçu ; sinon null. */
  costXof: number | null
}

/** Confronte une liste de matières au stock suivi (théorique) et aux prix reçus. */
export function checkAgainstStock(needs: Array<MaterialNeed>, stock: Array<StockRow>): StockCheck {
  const byId = new Map(stock.map((row) => [row.ingredientId as string, row]))
  const check: StockCheck = { unknown: [], short: [], costXof: 0 }
  for (const need of needs) {
    const row = byId.get(need.ingredientId)
    const quantity = row ? convert(need.gross, need.unit, row.unit) : null
    if (!row || quantity === null) {
      check.unknown.push(need.name)
      check.costXof = null
      continue
    }
    if (quantity > row.theoretical) check.short.push(need.name)
    check.costXof = check.costXof === null || row.avgUnitCostXof === null ? null : check.costXof + quantity * row.avgUnitCostXof
  }
  return { ...check, costXof: check.costXof === null ? null : Math.round(check.costXof) }
}
