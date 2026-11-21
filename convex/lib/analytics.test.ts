import { describe, expect, test } from 'vitest'
import { analyticsCsv, dayRow, totals } from './analytics'

const today = '2026-11-23'
const past = dayRow(
  {
    date: '2026-11-22',
    offers: [{ capacity: 10, active: 10, target: 12, served: 9 }],
    bookings: [
      ...Array.from({ length: 8 }, () => ({ status: 'picked_up' as const, priceXof: 1000 })),
      ...Array.from({ length: 2 }, () => ({ status: 'confirmed' as const, priceXof: 1000 })),
      { status: 'cancelled' as const, priceXof: 1000 },
    ],
    events: [
      { kind: 'prepared', portions: 12 },
      { kind: 'waste', portions: 2 },
      { kind: 'recovered', portions: 1 },
      { kind: 'walkin', portions: 1 },
    ],
    scores: [4, 5],
  },
  today,
)
const upcoming = dayRow({ date: today, offers: [{ capacity: 10, active: 3, target: null, served: 0 }], bookings: [{ status: 'confirmed', priceXof: 1000 }], events: [], scores: [] }, today)

describe('indicateurs', () => {
  test('jour passé : absents, complets, écart du plan', () => {
    expect(past).toMatchObject({ booked: 10, pickedUp: 8, noShow: 2, cancelled: 1, walkIns: 1, prepared: 12, wasted: 2, soldOut: 1, planError: 3, demoCreditsXof: 10000 })
  })

  test('taux avec dénominateurs ; services à venir exclus des taux de retrait et d’absence', () => {
    const t = totals([past, upcoming])
    expect(t.pickupRate).toEqual({ value: 80, numerator: 8, denominator: 10 })
    expect(t.noShowRate).toEqual({ value: 20, numerator: 2, denominator: 10 })
    expect(t.cancelRate).toEqual({ value: 8, numerator: 1, denominator: 12 })
    expect(t.wasteRate).toEqual({ value: 17, numerator: 2, denominator: 12 })
    expect(t.rating).toEqual({ value: 4.5, count: 2 })
    expect(t.planError).toEqual({ value: 3, services: 1 })
    expect(t.booked).toBe(11)
  })

  test('aucune donnée : taux nuls (null), jamais zéro inventé', () => {
    const t = totals([upcoming])
    expect(t.pickupRate.value).toBeNull()
    expect(t.wasteRate.value).toBeNull()
    expect(t.rating.value).toBeNull()
  })

  test('export : une ligne par jour, cellules échappées', () => {
    const csv = analyticsCsv([past])
    expect(csv.split('\r\n')).toHaveLength(2)
    expect(csv).toContain('"2026-11-22";"1";"10"')
  })
})

describe('export tableur', () => {
  test('formule neutralisée, guillemets échappés, nombres intacts', async () => {
    const { csvCell } = await import('./csv')
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"')
    expect(csvCell(-3)).toBe('"-3"')
    expect(csvCell('Grossiste "Adjamé"')).toBe('"Grossiste ""Adjamé"""')
  })
})
