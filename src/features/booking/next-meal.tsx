import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { SERVICE_LABELS, formatDayLong, todayIso } from '#/lib/format'
import { useT , useLocale } from '#/i18n/i18n'

/** Prochain repas confirmé, accessible dès l'accueil (#11 §3). Rien n'est affiché s'il n'y en a pas. */
export function NextMeal() {
  const { locale } = useLocale()
  const t = useT()
  const { data: bookings } = useQuery(convexQuery(api.bookings.mine, { from: todayIso() }))
  const next = bookings
    ?.filter((b) => b.status === 'confirmed')
    .sort((a, b) => a.cancellableUntil - b.cancellableUntil)[0]
  if (!next) return null
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <CalendarCheckIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">{t('Prochain repas')}</span>
          <span className="truncate font-semibold">{next.dishName}</span>
          <span className="text-sm text-muted-foreground first-letter:uppercase">
            {formatDayLong(next.date, locale)}, {t(SERVICE_LABELS[next.service]).toLowerCase()}
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/bookings">{t('Voir')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
