import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { SERVICE_LABELS, formatDayLong, formatXof, todayIso } from '#/lib/format'
import { useNow } from '#/lib/use-now'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import { usePickupPass } from '#/features/booking/pickup-pass-dialog'
import type { MyBooking } from '#/features/menus/meal-card'
import { useT , useLocale, pageTitle } from '#/i18n/i18n'

const STATUS: Record<MyBooking['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  confirmed: { label: 'Confirmée', variant: 'default' },
  picked_up: { label: 'Retirée', variant: 'secondary' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

export const Route = createFileRoute('/_authed/app/bookings')({
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Mes repas') }] }),
  component: BookingsPage,
})

/** Réservations à partir d'aujourd'hui. Mobile : cartes groupées. Dès la tablette : tableau avec action contextuelle. */
function BookingsPage() {
  const { locale } = useLocale()
  const t = useT()
  const { data: bookings, isPending } = useQuery(convexQuery(api.bookings.mine, { from: todayIso() }))
  const now = useNow()
  const upcoming = (bookings ?? []).filter((b) => b.status === 'confirmed')
  const done = (bookings ?? []).filter((b) => b.status !== 'confirmed')
  const engagedXof = upcoming.reduce((sum, b) => sum + b.priceXof, 0)
  const pass = usePickupPass(bookings)
  const cancellable = (b: MyBooking) => b.status === 'confirmed' && now < b.cancellableUntil

  return (
    <main className="workspace flex flex-col gap-6 pt-2 pb-8 md:pt-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-muted-foreground">{t('Réservations')}</p>
          <h1 className="text-display">{t('Mes repas')}</h1>
        </div>
        {!isPending && (bookings?.length ?? 0) > 0 && (
          <dl className="grid grid-cols-2 divide-x rounded-2xl border bg-card shadow-card md:min-w-80">
            <div className="flex flex-col gap-0.5 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">{t('À venir')}</dt>
              <dd className="text-xl font-bold tabular-nums">{upcoming.length}</dd>
            </div>
            <div className="flex flex-col gap-0.5 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">{t('Crédits engagés')}</dt>
              <dd className="text-xl font-bold tabular-nums">{formatXof(engagedXof)}</dd>
            </div>
          </dl>
        )}
      </header>

      {isPending ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : !bookings?.length ? (
        <Empty className="rounded-3xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheckIcon />
            </EmptyMedia>
            <EmptyTitle>{t('Aucune réservation à venir')}</EmptyTitle>
            <EmptyDescription>{t('Réservez depuis le menu de la semaine.')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-6 md:hidden">
            {[
              { title: 'À venir', list: upcoming },
              { title: 'Retirés et annulés', list: done },
            ]
              .filter(({ list }) => list.length > 0)
              .map(({ title, list }) => (
                <section key={title} className="flex flex-col gap-3">
                  <h2 className="text-eyebrow text-muted-foreground">{t(title)}</h2>
                  {list.map((booking) => (
                    <article key={booking._id} className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-semibold">{booking.dishName}</span>
                          <span className="text-sm text-muted-foreground first-letter:uppercase">
                            {formatDayLong(booking.date, locale)}, {t(SERVICE_LABELS[booking.service]).toLowerCase()}
                          </span>
                        </div>
                        <Badge variant={STATUS[booking.status].variant}>{t(STATUS[booking.status].label)}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary tabular-nums">{formatXof(booking.priceXof)}</span>
                        <div className="flex gap-2">
                          {booking.status === 'confirmed' && pass.trigger(booking)}
                          {cancellable(booking) && (
                            <CancelBookingDialog bookingId={booking._id} dishName={booking.dishName} priceXof={booking.priceXof} />
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              ))}
          </div>

          <div className="hidden rounded-3xl border bg-card px-4 py-2 shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Service')}</TableHead>
                  <TableHead>{t('Plat')}</TableHead>
                  <TableHead className="text-right">{t('Prix')}</TableHead>
                  <TableHead>{t('Statut')}</TableHead>
                  <TableHead className="text-right">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...upcoming, ...done].map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell className="font-medium first-letter:uppercase">{formatDayLong(booking.date, locale)}</TableCell>
                    <TableCell className="text-muted-foreground">{t(SERVICE_LABELS[booking.service])}</TableCell>
                    <TableCell className="max-w-72 truncate">{booking.dishName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatXof(booking.priceXof)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS[booking.status].variant}>{t(STATUS[booking.status].label)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status === 'confirmed' && pass.trigger(booking)}
                        {cancellable(booking) ? (
                          <CancelBookingDialog bookingId={booking._id} dishName={booking.dishName} priceXof={booking.priceXof} />
                        ) : (
                          booking.status !== 'confirmed' && <span className="text-xs text-muted-foreground">{t('Aucune')}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {pass.dialog}
    </main>
  )
}
