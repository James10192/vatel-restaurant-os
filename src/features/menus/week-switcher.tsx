import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { addDays, weekLabel } from './week'
import { useT , useLocale } from '#/i18n/i18n'

/** Semaine précédente / suivante, conservée dans l'URL (`?week=`). */
export function WeekSwitcher({ week, to }: { week: string; to: '/app' | '/admin/menus' }) {
  const { locale } = useLocale()
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-1 sm:justify-start">
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={{ week: addDays(week, -7) }} aria-label={t('Semaine précédente')}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="min-w-36 text-center text-sm font-semibold">{weekLabel(week, t, locale)}</span>
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={{ week: addDays(week, 7) }} aria-label={t('Semaine suivante')}>
          <ChevronRightIcon />
        </Link>
      </Button>
    </div>
  )
}
