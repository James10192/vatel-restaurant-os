import { describe, expect, test } from 'vitest'
import { addDays, isIsoDate, weekStartOf } from './dates'

describe('isIsoDate', () => {
  test.each(['2026-11-23', '2028-02-29', '2026-12-31'])('accepte %s', (value) => {
    expect(isIsoDate(value)).toBe(true)
  })

  test.each([
    '2026-02-31',
    '2026-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-1-5',
    '26-11-23',
    ' 2026-11-23',
    '2026-11-23T00:00:00Z',
    '2026/11/23',
    '0000-01-01',
    '9999-12-31',
    '',
    'lundi',
  ])('refuse %j', (value) => {
    expect(isIsoDate(value)).toBe(false)
  })

  test('refuse les valeurs non textuelles', () => {
    for (const value of [undefined, null, 20261123, ['2026-11-23']]) expect(isIsoDate(value)).toBe(false)
  })
})

describe('semaine', () => {
  test('lundi de la semaine, y compris dimanche et changement de mois', () => {
    expect(weekStartOf('2026-11-23')).toBe('2026-11-23')
    expect(weekStartOf('2026-11-29')).toBe('2026-11-23')
    expect(weekStartOf('2026-12-02')).toBe('2026-11-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})
