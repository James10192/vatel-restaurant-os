import { describe, expect, it } from 'vitest'
import { buildGreeting, momentOf } from './greeting'

const at = (hour: number) => new Date(2026, 10, 21, hour, 0, 0)
const DAY = 86_400_000

describe('salutation', () => {
  it('suit le moment de la journée', () => {
    expect(momentOf(8)).toBe('morning')
    expect(momentOf(14)).toBe('afternoon')
    expect(momentOf(20)).toBe('evening')
    expect(momentOf(2)).toBe('night')
  })
  it('souhaite la bienvenue à la première visite', () => {
    expect(buildGreeting('Awa', at(9), null).title).toBe('Bienvenue Awa')
  })
  it('dit bon retour après une absence', () => {
    const now = at(9)
    expect(buildGreeting('Awa', now, now.getTime() - 3 * DAY).title).toBe('Bon retour Awa')
    expect(buildGreeting('Awa', now, now.getTime() - 10 * DAY).subtitle).not.toBeNull()
  })
  it('salue selon l’heure pour un habitué', () => {
    const now = at(20)
    expect(buildGreeting('Awa', now, now.getTime() - 3_600_000).title).toBe('Bonsoir Awa')
    expect(buildGreeting('Awa', at(13), at(13).getTime() - 3_600_000).title).toBe('Bon après-midi Awa')
  })
})
