import { describe, expect, test } from 'vitest'
import { expiringLots, positionOf, toBuy } from './position'
import { convert } from './units'

describe('unités', () => {
  test('masse et volume seulement ; le reste est incompatible', () => {
    expect(convert(2.4, 'kg', 'g')).toBe(2400)
    expect(convert(1500, 'ml', 'L')).toBe(1.5)
    expect(convert(3, 'pièce', 'pièce')).toBe(3)
    expect(convert(1, 'kg', 'L')).toBeNull()
    expect(convert(1, 'sac', 'kg')).toBeNull()
  })
})

describe('position de stock', () => {
  const receptions = [
    { at: 1, quantity: 10, unit: 'kg', lotCode: 'A', expiresOn: '2026-11-22', unitCostXof: 800 },
    { at: 3, quantity: 5, unit: 'kg', lotCode: 'B', expiresOn: '2026-11-30', unitCostXof: 1000 },
  ]
  test('théorique = réceptions - consommation des fiches - pertes ; lots restants FIFO ; coût moyen', () => {
    const p = positionOf('g', receptions, [], [{ at: 2, quantity: 4000, unit: 'g' }, { at: 4, quantity: 1, unit: 'kg' }])
    expect(p.unit).toBe('kg')
    expect(p.theoretical).toBe(10)
    expect(p.lots).toEqual([
      { lotCode: 'B', expiresOn: '2026-11-30', remaining: 5 },
      { lotCode: 'A', expiresOn: '2026-11-22', remaining: 5 },
    ])
    expect(p.avgUnitCostXof).toBeCloseTo((10 * 800 + 5 * 1000) / 15)
    expect(expiringLots(p, '2026-11-21', '2026-11-23')).toEqual([{ lotCode: 'A', expiresOn: '2026-11-22', remaining: 5, expired: false }])
    expect(toBuy(14, p)).toBe(4)
  })

  test('inventaire : nouveau départ, seuls les mouvements postérieurs comptent', () => {
    const p = positionOf('kg', receptions, [{ at: 2.5, quantity: 3000, unit: 'g' }], [{ at: 2, quantity: 99, unit: 'kg' }, { at: 4, quantity: 1, unit: 'kg' }])
    expect(p.unit).toBe('g')
    expect(p.theoretical).toBe(3000 + 5000 - 1000)
    expect(p.lastCount).toEqual({ at: 2.5, quantity: 3000 })
  })

  test('unités incompatibles : sortie ignorée et signalée, jamais devinée ; jamais négatif', () => {
    const p = positionOf('kg', [{ at: 1, quantity: 2, unit: 'kg' }], [], [{ at: 2, quantity: 3, unit: 'pièce' }, { at: 3, quantity: 5, unit: 'kg' }])
    expect(p.incompatible).toEqual(['pièce'])
    expect(p.theoretical).toBe(0)
    expect(p.avgUnitCostXof).toBeNull()
  })
})
