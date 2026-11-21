import { describe, expect, test } from 'vitest'
import { materialsFor, simulate, sumMaterials, validateInputs } from './plan'
import type { Baseline, Recipe } from './plan'
import { maxDeclarable, wasteBalance } from './waste'

const none = { walkIns: 0, margin: 0, preparedAssumed: 0 }
const base = (prepared: number | null, capacity = 200): Baseline => ({ capacity, confirmed: 150, pickedUp: 0, prepared })

/** Riz cru 80 g/portion ; poulet net 120 g à rendement 75 % (160 g brut/portion), fiche pour 10 portions. */
const recipe: Recipe = {
  portions: 10,
  lines: [
    { ingredientId: 'riz', name: 'Riz', unitId: 'g', unit: 'g', quantity: 800, lossPct: 0 },
    { ingredientId: 'poulet', name: 'Poulet', unitId: 'g', unit: 'g', quantity: 1600, lossPct: 25 },
  ],
}

describe('Smart Production : scénarios de référence (#5)', () => {
  test('150 demandés, 50 préparés, 30 annulations : 30 portions évitables, matière théorique', () => {
    const sim = simulate(base(50), none, { cancellations: 30, arrivals: 0 })
    expect(sim.before).toEqual({ demand: 150, prepared: 50, missing: 100, surplus: 0 })
    expect(sim.after).toEqual({ demand: 120, prepared: 50, missing: 70, surplus: 0 })
    expect(sim.avoidable).toBe(30)
    expect(sim.recommendation).toBe('reduce')
    const [riz, poulet] = materialsFor(recipe, sim.avoidable) ?? []
    expect(riz.gross).toBeCloseTo(2400)
    expect(poulet.gross).toBeCloseTo(4800)
    expect(poulet.net).toBeCloseTo(3600)
  })

  test('même baisse après 140 préparées : 10 évitables au plus, 20 en surplus potentiel', () => {
    const sim = simulate(base(140), none, { cancellations: 30, arrivals: 0 })
    expect(sim.before.missing).toBe(10)
    expect(sim.after.missing).toBe(0)
    expect(sim.avoidable).toBe(10)
    expect(sim.after.surplus).toBe(20)
    expect(sim.recommendation).toBe('stop')
  })

  test('hausse de 20 avec capacité 160 : 170 demandés, dépassement 10 signalé, rien d’écrêté', () => {
    const sim = simulate(base(50, 160), none, { cancellations: 0, arrivals: 20 })
    expect(sim.after.demand).toBe(170)
    expect(sim.extra).toBe(20)
    expect(sim.capacityOverflow).toBe(10)
    expect(sim.recommendation).toBe('increase')
  })

  test('remis comptés une seule fois ; hypothèses de passage et marge visibles avant et après', () => {
    const sim = simulate({ capacity: 100, confirmed: 30, pickedUp: 20, prepared: 40 }, { walkIns: 5, margin: 3, preparedAssumed: 0 }, {
      cancellations: 0,
      arrivals: 0,
    })
    expect(sim.before.demand).toBe(58)
    expect(sim.after).toEqual(sim.before)
    expect(sim.recommendation).toBe('hold')
  })

  test('préparé inconnu : hypothèse explicite, signalée comme telle', () => {
    const sim = simulate(base(null), { ...none, preparedAssumed: 60 }, { cancellations: 0, arrivals: 0 })
    expect(sim.preparedKnown).toBe(false)
    expect(sim.before.missing).toBe(90)
  })
})

describe('Saisie de simulation', () => {
  test('négatif, décimal et annulations au-delà des réservations annulables refusés', () => {
    const issues = validateInputs(base(50), { ...none, margin: -1 }, { cancellations: 151, arrivals: 1.5 })
    expect(issues.map((i) => i.field).sort()).toEqual(['arrivals', 'cancellations', 'margin'])
    expect(() => simulate(base(50), none, { cancellations: 151, arrivals: 0 })).toThrow(RangeError)
  })

  test('remis exclus des annulations possibles', () => {
    const issues = validateInputs({ capacity: 10, confirmed: 2, pickedUp: 8, prepared: 10 }, none, { cancellations: 3, arrivals: 0 })
    expect(issues).toEqual([{ field: 'cancellations', message: 'Au plus {n} réservations encore annulables.' }])
  })
})

describe('Matières', () => {
  test('fiche absente, vide ou perte invalide : besoin inconnu (null), jamais zéro', () => {
    expect(materialsFor(null, 10)).toBeNull()
    expect(materialsFor({ portions: 10, lines: [] }, 10)).toBeNull()
    expect(materialsFor({ portions: 0, lines: recipe.lines }, 10)).toBeNull()
    expect(materialsFor({ portions: 10, lines: [{ ...recipe.lines[0], lossPct: 100 }] }, 10)).toBeNull()
  })

  test('somme par ingrédient et unité, sans conversion implicite', () => {
    const a = materialsFor(recipe, 10) ?? []
    const kg = [{ ingredientId: 'riz', name: 'Riz', unitId: 'kg', unit: 'kg', gross: 1, net: 1 }]
    const total = sumMaterials([a, a, kg])
    expect(total).toHaveLength(3)
    expect(total.find((m) => m.unitId === 'g' && m.ingredientId === 'riz')?.gross).toBeCloseTo(1600)
  })
})

describe('Smart Waste : bilan réel (#6)', () => {
  test('préparé, remis, perdu et reste à déclarer distincts', () => {
    const b = wasteBalance({ prepared: 100, pickedUp: 70, confirmed: 10, waste: { surplus: 10, not_picked_up: 5, kitchen: 0, quality: 0 }, recovered: 3 })
    expect(b).toEqual({ prepared: 100, served: 70, wasted: 15, recovered: 3, pending: 10, unexplained: 2, servedExceedsPrepared: false, wasteRate: 15 })
    expect(maxDeclarable(100, 70, 18)).toBe(12)
  })

  test('préparé inconnu : pas de taux inventé ; remis au-delà du préparé signalé', () => {
    expect(wasteBalance({ prepared: null, pickedUp: 3, confirmed: 0, waste: { surplus: 0, not_picked_up: 0, kitchen: 0, quality: 0 }, recovered: 0 }).wasteRate).toBeNull()
    expect(wasteBalance({ prepared: 2, pickedUp: 3, confirmed: 0, waste: { surplus: 0, not_picked_up: 0, kitchen: 0, quality: 0 }, recovered: 0 }).servedExceedsPrepared).toBe(true)
  })
})
