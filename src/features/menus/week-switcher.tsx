import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { addDays, weekLabel } from './week'

/** Semaine précédente / suivante, conservée dans l'URL (`?week=`). */
export function WeekSwitcher({ week, to }: { week: string; to: '/app' | '/admin/menus' }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={{ week: addDays(week, -7) }} aria-label="Semaine précédente">
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">{weekLabel(week)}</span>
      <Button variant="outline" size="icon" asChild>
        <Link to={to} search={{ week: addDays(week, 7) }} aria-label="Semaine suivante">
          <ChevronRightIcon />
        </Link>
      </Button>
    </div>
  )
}
