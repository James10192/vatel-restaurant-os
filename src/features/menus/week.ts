import { addDays, isIsoDate, weekStartOf } from '../../../convex/lib/dates'
import { formatDayShort, todayIso } from '#/lib/format'

export { addDays, weekStartOf }

/** Paramètre d'URL `week` optionnel ; absent = semaine en cours. */
export function parseWeekSearch(search: Record<string, unknown>): { week?: string } {
  return isIsoDate(search.week) ? { week: weekStartOf(search.week) } : {}
}

/** Lundi de la semaine demandée, ou de la semaine en cours. */
export const resolveWeek = (week: string | undefined) => weekStartOf(week ?? todayIso())

/** « 23 nov. au 29 nov. » */
export const weekLabel = (weekStart: string) => `${formatDayShort(weekStart)} au ${formatDayShort(addDays(weekStart, 6))}`
