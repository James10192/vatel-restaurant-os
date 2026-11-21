import { describe, expect, test } from 'vitest'
import { allergyAlert, cleanAllergyList } from './allergies'

const declared = (present: Array<string>, traces: Array<string> = []) => ({ status: 'declared' as const, present, traces })

describe('allergies', () => {
  test('une mention libre qui nomme un allergène majeur devient ce code ; doublons retirés', () => {
    expect(cleanAllergyList({ codes: ['milk'], others: ['Arachide', ' mangue ', 'Mangue', 'Kiwi'] })).toEqual({
      codes: ['peanuts', 'milk'],
      others: ['mangue', 'Kiwi'],
    })
  })

  test('saisie libre bornée', () => {
    expect(() => cleanAllergyList({ codes: [], others: ['x'] })).toThrow(/2 à 40/)
    expect(() => cleanAllergyList({ codes: [], others: Array.from({ length: 13 }, (_, i) => `Fruit ${i}`) })).toThrow(/12/)
  })

  test('alerte : majeur présent ou en traces, mention libre dans un ingrédient, sans accents ni casse', () => {
    const me = { codes: ['peanuts' as const, 'fish' as const], others: ['piment'] }
    expect(allergyAlert(me, declared(['Arachides']), ['Riz'])).toEqual({ matches: ['Arachides'], unknown: false })
    expect(allergyAlert(me, declared([], ['Poisson']), [])).toEqual({ matches: ['Poissons'], unknown: false })
    expect(allergyAlert(me, declared([]), ['Piment rouge'])).toEqual({ matches: ['piment'], unknown: false })
    expect(allergyAlert(me, declared(['Gluten']), ['Pâtes'])).toEqual({ matches: [], unknown: false })
  })

  test('plat non renseigné : échec fermé ; personne sans allergie : aucune alerte', () => {
    expect(allergyAlert({ codes: ['milk'], others: [] }, { status: 'unknown' }, [])).toEqual({ matches: [], unknown: true })
    expect(allergyAlert({ codes: [], others: [] }, declared(['Lait']), [])).toBeUndefined()
    expect(allergyAlert(undefined, declared(['Lait']), [])).toBeUndefined()
  })
})
