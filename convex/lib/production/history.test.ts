import { describe, expect, test } from 'vitest'
import { suggest, summarizeHistory } from './history'
import type { PastService } from './history'

const service = (over: Partial<PastService>): PastService => ({ date: '2026-11-16', booked: 100, pickedUp: 90, noShow: 10, cancelled: 5, prepared: 110, wasted: 11, ...over })

describe('historique et estimation par règles', () => {
  test('taux sur les réservations actives, pertes sur le préparé mesuré seulement', () => {
    const h = summarizeHistory([service({}), service({ booked: 50, pickedUp: 50, noShow: 0, cancelled: 0, prepared: null, wasted: 0 })])
    expect(h).toEqual({ services: 2, avgBooked: 75, pickupRate: 93, noShowRate: 7, cancelRate: 3, wasteRate: 10 })
  })

  test('démarrage à froid : marge par défaut, aucune absence supposée', () => {
    expect(suggest(summarizeHistory([service({})]), 40)).toEqual({ coldStart: true, margin: 2, expectedNoShows: 0 })
  })

  test('historique suffisant : absences attendues d’après le taux observé', () => {
    const h = summarizeHistory([service({}), service({}), service({})])
    expect(suggest(h, 150)).toEqual({ coldStart: false, margin: 8, expectedNoShows: 15 })
  })

  test('aucun historique : rien d’inventé', () => {
    expect(summarizeHistory([])).toEqual({ services: 0, avgBooked: null, pickupRate: null, noShowRate: null, cancelRate: null, wasteRate: null })
  })
})
