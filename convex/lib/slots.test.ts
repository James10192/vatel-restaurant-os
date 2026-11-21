import { describe, expect, test } from 'vitest'
import { assignSlot, slotEndsAt, slotsOf } from './slots'

const policy = { startHHMM: '12:00', durationMinutes: 60, slotMinutes: 15, slotCapacity: 2 }

describe('créneaux', () => {
  test('découpage du service', () => {
    expect(slotsOf(policy)).toEqual(['12:00', '12:15', '12:30', '12:45'])
    expect(slotsOf({ ...policy, startHHMM: '23:30' })).toEqual(['23:30', '23:45', '00:00', '00:15'])
  })
  test('créneau demandé s’il a de la place, sinon le premier libre, sinon refus', () => {
    expect(assignSlot(policy, {}, '12:30')).toBe('12:30')
    expect(assignSlot(policy, { '12:30': 2 }, '12:30')).toBe('12:00')
    expect(assignSlot(policy, { '12:00': 2 }, 'n’importe quoi')).toBe('12:15')
    expect(assignSlot(policy, { '12:00': 2, '12:15': 2, '12:30': 2, '12:45': 2 })).toBeNull()
  })
  test('fin du créneau', () => {
    expect(slotEndsAt('2026-11-23', '12:15', 15)).toBe(Date.parse('2026-11-23T12:30:00Z'))
  })
})
