import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { addDays, isIsoDate } from '../../../convex/lib/dates'
import { Button } from '#/components/ui/button'
import { formatDayLong, todayIso } from '#/lib/format'

/** Paramètre d'URL `date` optionnel et validé ; absent = aujourd'hui. */
export function parseDateSearch(search: Record<string, unknown>): { date?: string } {
  return isIsoDate(search.date) ? { date: search.date } : {}
}

export const resolveDate = (date: string | undefined) => date ?? todayIso()

type DayRoute = '/admin' | '/admin/services'

/** Jour précédent / suivant / aujourd'hui ; les autres filtres de la page sont conservés. */
export function DayNav({ date, to }: { date: string; to: DayRoute }) {
  const today = todayIso()
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={(prev) => ({ ...prev, date: addDays(date, -1) })} aria-label="Jour précédent">
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="min-w-44 text-center text-sm font-semibold first-letter:uppercase">{formatDayLong(date)}</span>
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={(prev) => ({ ...prev, date: addDays(date, 1) })} aria-label="Jour suivant">
          <ChevronRightIcon />
        </Link>
      </Button>
      {date !== today && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={to} search={(prev) => ({ ...prev, date: undefined })}>
            Aujourd’hui
          </Link>
        </Button>
      )}
    </div>
  )
}
