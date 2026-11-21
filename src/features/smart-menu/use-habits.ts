import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { SmartRequest } from './smart-menu-form'
import { budgetValue } from './smart-menu-form'
import { useServerAction } from '#/lib/server-action'

/** Jour de la semaine ISO (1 = lundi ... 7 = dimanche) d'une date « AAAA-MM-JJ ». */
const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay() || 7

/**
 * Habitudes de l'usager : une demande pré-remplie pour la semaine affichée (jours qui ont un menu seulement),
 * et l'enregistrement de la demande courante comme habitude. Rien n'est réservé.
 */
export function useHabits(days: Array<string>, daysWithMenu: Set<string>) {
  const { data: habit } = useQuery(convexQuery(api.habits.mine, {}))
  const save = useServerAction(useMutation(api.habits.save))
  const prefill: SmartRequest | null = habit
    ? {
        days: days.filter((d) => daysWithMenu.has(d) && habit.weekdays.includes(weekdayOf(d))),
        budget: String(habit.budgetXof),
        service: habit.service,
        avoid: habit.avoid,
        wish: '',
      }
    : null
  const remember = (request: SmartRequest) =>
    save.run({ habit: { weekdays: [...new Set(request.days.map(weekdayOf))], budgetXof: budgetValue(request.budget), service: request.service, avoid: request.avoid } })
  return { prefill, remember, saving: save.pending, error: save.error, saved: Boolean(habit) }
}
