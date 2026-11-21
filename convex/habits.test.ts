import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import { setupCanteens } from '../tests/convex-fixture'

describe('habitudes', () => {
  test('enregistrées, nettoyées, propres à l’usager, effaçables', async () => {
    const { studentA, studentA2, stranger } = await setupCanteens()
    await studentA.mutation(api.habits.save, { habit: { weekdays: [5, 1, 1], budgetXof: 6000, service: 'lunch', avoid: [' Arachides ', 'Arachides', ''] } })
    expect(await studentA.query(api.habits.mine, {})).toEqual({ weekdays: [1, 5], budgetXof: 6000, service: 'lunch', avoid: ['Arachides'] })
    expect(await studentA2.query(api.habits.mine, {})).toBeNull()
    await studentA.mutation(api.habits.clear, {})
    expect(await studentA.query(api.habits.mine, {})).toBeNull()
    await expect(stranger.query(api.habits.mine, {})).rejects.toThrow(/rattaché/)
  })

  test('entrées invalides refusées', async () => {
    const { studentA } = await setupCanteens()
    const save = (habit: Partial<{ weekdays: Array<number>; budgetXof: number }>) =>
      studentA.mutation(api.habits.save, { habit: { weekdays: [1], budgetXof: 5000, service: 'any', avoid: [], ...habit } })
    await expect(save({ weekdays: [] })).rejects.toThrow(/Jours/)
    await expect(save({ weekdays: [8] })).rejects.toThrow(/Jours/)
    await expect(save({ budgetXof: 0 })).rejects.toThrow(/Budget/)
    await expect(save({ budgetXof: 2.5 })).rejects.toThrow(/Budget/)
  })
})
