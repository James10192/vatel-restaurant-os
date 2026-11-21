import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { addDays, isIsoDate } from '../../../convex/lib/dates'
import { Button } from '#/components/ui/button'
import { formatDayLong, todayIso } from '#/lib/format'
import { useT , useLocale } from '#/i18n/i18n'
import type { Locale, Translate } from '#/i18n/i18n'

/** Paramètre d'URL `date` optionnel et validé ; absent = aujourd'hui. */
export function parseDateSearch(search: Record<string, unknown>): {
  date?: string
} {
  return isIsoDate(search.date) ? { date: search.date } : {}
}

export const resolveDate = (date: string | undefined) => date ?? todayIso()

/** Complément après « Service » : « du jour », « de demain », « d'hier » ou « du lundi 23 novembre ». */
export function serviceDayLabel(date: string, t: Translate, locale: Locale): string {
  const today = todayIso()
  if (date === today) return t('du jour')
  if (date === addDays(today, 1)) return t('de demain')
  if (date === addDays(today, -1)) return t('d’hier')
  return t('du {day}', { day: formatDayLong(date, locale) })
}

type DayRoute = '/admin' | '/admin/services' | '/admin/production'

/** Jour précédent / suivant / aujourd'hui ; les autres filtres de la page sont conservés. */
export function DayNav({ date, to }: { date: string; to: DayRoute }) {
  const { locale } = useLocale()
  const t = useT()
  const today = todayIso()
  return (
    <div className="flex w-full items-center gap-1 md:w-auto">
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={(prev) => ({ ...prev, date: addDays(date, -1) })} aria-label={t('Jour précédent')}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold first-letter:uppercase md:min-w-44 md:flex-none">
        {formatDayLong(date, locale)}
      </span>
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={(prev) => ({ ...prev, date: addDays(date, 1) })} aria-label={t('Jour suivant')}>
          <ChevronRightIcon />
        </Link>
      </Button>
      {date !== today && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={to} search={(prev) => ({ ...prev, date: undefined })}>
            {t('Aujourd’hui')}
          </Link>
        </Button>
      )}
    </div>
  )
}
