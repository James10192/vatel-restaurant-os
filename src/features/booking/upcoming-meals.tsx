import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ArrowRightIcon, CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayShort, formatXof, todayIso } from '#/lib/format'

const LIMIT = 4

/** Repas réservés à venir (panneau latéral du bureau) : la suite de la semaine sans quitter le catalogue. */
export function UpcomingMeals() {
  const { data: bookings, isPending } = useQuery(convexQuery(api.bookings.mine, { from: todayIso() }))
  const upcoming = (bookings ?? [])
    .filter((b) => b.status === 'confirmed')
    .sort((a, b) => a.cancellableUntil - b.cancellableUntil)
  return (
    <Card className="gap-3 rounded-3xl py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Mes prochains repas</CardTitle>
        <CardDescription className="tabular-nums">
          {isPending ? 'Chargement…' : upcoming.length === 0 ? 'Aucune réservation à venir' : `${upcoming.length} à venir`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-3">
        {isPending ? (
          <Skeleton className="mx-2 h-14 rounded-2xl" />
        ) : upcoming.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Réservez un plat dans le menu de la semaine.</p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.slice(0, LIMIT).map((b) => (
              <li key={b._id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <CalendarCheckIcon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{b.dishName}</span>
                  <span className="text-xs text-muted-foreground first-letter:uppercase">
                    {formatDayShort(b.date)}, {SERVICE_LABELS[b.service].toLowerCase()}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatXof(b.priceXof)}</span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <Link to="/app/bookings">
            Tous mes repas
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
