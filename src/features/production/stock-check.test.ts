// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { checkAgainstStock } from './stock-check'
import type { StockRow } from '../stock/stock-model'

const row = (over: Partial<StockRow>): StockRow => ({
  ingredientId: 'riz' as StockRow['ingredientId'],
  name: 'Riz',
  unit: 'kg',
  theoretical: 2,
  lastCount: null,
  incompatible: [],
  lots: [],
  avgUnitCostXof: 600,
  need: null,
  lastSupplier: null,
  lastUnitCostXof: null,
  usedIn: [],
  ...over,
})
const need = (ingredientId: string, gross: number, unit = 'g') => ({ ingredientId, name: ingredientId, unitId: unit, unit, gross, net: gross })

describe('matière simulée face au stock', () => {
  test('couverture et coût, conversion g -> kg', () => {
    expect(checkAgainstStock([need('riz', 1500)], [row({})])).toEqual({ unknown: [], short: [], costXof: 900 })
  })
  test('stock insuffisant nommé ; ingrédient non suivi : inconnu et coût non calculé', () => {
    expect(checkAgainstStock([need('riz', 2400), need('poulet', 100)], [row({})])).toEqual({ unknown: ['poulet'], short: ['riz'], costXof: null })
  })
  test('prix absent ou unité incompatible : jamais de coût partiel', () => {
    expect(checkAgainstStock([need('riz', 100)], [row({ avgUnitCostXof: null })]).costXof).toBeNull()
    expect(checkAgainstStock([need('riz', 1, 'sac')], [row({})])).toEqual({ unknown: ['riz'], short: [], costXof: null })
  })
})
