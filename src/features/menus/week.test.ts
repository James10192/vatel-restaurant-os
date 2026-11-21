import { describe, expect, test } from 'vitest'
import { parseWeekSearch } from './week'

describe('paramètre d’URL week', () => {
  test('paramètre ?week= : valide normalisé au lundi, invalide ignoré', () => {
    expect(parseWeekSearch({ week: '2026-11-26' })).toEqual({ week: '2026-11-23' })
    for (const week of ['2026-02-31', 'x', 42, '2026-11-23<script>']) expect(parseWeekSearch({ week })).toEqual({})
  })
})
