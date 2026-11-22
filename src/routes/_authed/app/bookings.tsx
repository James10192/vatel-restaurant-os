import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import type { UsePaginatedQueryResult } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import { useNow } from '#/lib/use-now'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import { usePickupPass } from '#/features/booking/pickup-pass-dialog'
import { RateMeal } from '#/features/booking/rate-meal'
import { ChangeSlotDialog } from '#/features/booking/change-slot-dialog'
import type { MyBooking } from '#/features/menus/meal-card'
import { PageHeader } from '#/components/page-header'
import { useLocale, useT, pageTitle } from '#/i18n/i18n'

const PAGE_SIZE = 10

type HistoryRow = FunctionReturnType<typeof api.myMeals.history>['page'][number]

const STATUS: Record<MyBooking['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  confirmed: { label: 'Confirmée', variant: 'default' },
  picked_up: { label: 'Retirée', variant: 'secondary' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

export const Route = createFileRoute('/_authed/app/bookings')({
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Mes repas') }] }),
  component: BookingsPage,
})

/** Repas à venir puis historique, chacun paginé côté serveur. Mobile : cartes. Dès la tablette : lignes alignées. */
function BookingsPage() {
  const t = useT()
  const upcoming = usePaginatedQuery(api.myMeals.upcoming, {}, { initialNumItems: PAGE_SIZE })
  const history = usePaginatedQuery(api.myMeals.history, {}, { initialNumItems: PAGE_SIZE })
  const { data: summary } = useQuery(convexQuery(api.myMeals.summary, {}))
  const pass = usePickupPass(upcoming.results)
  const loading = upcoming.status === 'LoadingFirstPage' || history.status === 'LoadingFirstPage'
  const empty = !loading && upcoming.results.length === 0 && history.results.length === 0

  return (
    <main className="workspace flex flex-col gap-6 py-6 md:py-8 xl:py-10">
      <PageHeader
        title={t('Mes repas')}
        actions={
          summary &&
          summary.upcoming > 0 && (
            <dl className="grid grid-cols-2 divide-x rounded-2xl border bg-card shadow-card md:min-w-80">
              <div className="flex flex-col gap-0.5 px-4 py-2.5">
                <dt className="text-xs text-muted-foreground">{t('À venir')}</dt>
                <dd className="text-xl font-bold tabular-nums">{summary.upcoming}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-4 py-2.5">
                <dt className="text-xs text-muted-foreground">{t('Crédits engagés')}</dt>
                <dd className="text-xl font-bold tabular-nums">{formatXof(summary.engagedXof)}</dd>
              </div>
            </dl>
          )
        }
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : empty ? (
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
          <BookingSection title="À venir" list={upcoming} render={(b) => <BookingItem key={b._id} booking={b} pass={pass.trigger(b)} />} />
          <BookingSection title="Retirés et annulés" list={history} render={(b) => <BookingItem key={b._id} booking={b} score={b.score} />} />
        </>
      )}
      {pass.dialog}
    </main>
  )
}

function BookingSection<TRow>({ title, list, render }: { title: string; list: UsePaginatedQueryResult<TRow>; render: (row: TRow) => React.ReactNode }) {
  const t = useT()
  if (list.results.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t(title)}</h2>
      <ul className="flex flex-col gap-3 md:gap-0 md:divide-y md:rounded-3xl md:border md:bg-card md:shadow-card">{list.results.map(render)}</ul>
      {list.status === 'CanLoadMore' && (
        <Button variant="outline" className="self-center rounded-full" onClick={() => list.loadMore(PAGE_SIZE)}>
          {t('Afficher plus')}
        </Button>
      )}
      {list.status === 'LoadingMore' && <Spinner className="self-center" />}
    </section>
  )
}

/** Une réservation : carte sur mobile, ligne alignée en colonnes dès la tablette. Une seule définition. */
function BookingItem({ booking, pass, score }: { booking: MyBooking | HistoryRow; pass?: React.ReactNode; score?: number }) {
  const t = useT()
  const { locale } = useLocale()
  const now = useNow()
  const cancellable = booking.status === 'confirmed' && now < booking.cancellableUntil
  const status = STATUS[booking.status]
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-3xl border bg-card p-4 shadow-card md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem_7rem_14rem] md:rounded-none md:border-0 md:bg-transparent md:px-5 md:py-3 md:shadow-none">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium first-letter:uppercase">{formatDayLong(booking.date, locale)}</span>
        <span className="text-sm text-muted-foreground">{t(SERVICE_LABELS[booking.service])}</span>
        <SlotLine booking={booking} cancellable={cancellable} />
      </div>
      <Badge variant={status.variant} className="justify-self-end md:order-4 md:justify-self-start">
        {t(status.label)}
      </Badge>
      {/* Mobile : le plat en tête de carte ; bureau : deuxième colonne, après la date. */}
      <span className="order-first col-span-2 truncate text-base font-semibold md:order-2 md:col-span-1 md:font-normal">{booking.dishName}</span>
      <span className="font-bold text-primary tabular-nums md:order-3 md:text-right md:font-normal md:text-foreground">{formatXof(booking.priceXof)}</span>
      <div className="flex items-center justify-end gap-2 md:order-5">
        {booking.status === 'picked_up' && <RateMeal bookingId={booking._id} score={score} />}
        {pass}
        {cancellable && <CancelBookingDialog bookingId={booking._id} dishName={booking.dishName} priceXof={booking.priceXof} />}
      </div>
    </li>
  )
}

/** Créneau de retrait : modifiable tant que la réservation l'est, sinon simple rappel. */
function SlotLine({ booking, cancellable }: { booking: MyBooking; cancellable: boolean }) {
  const t = useT()
  if (!booking.slot) return null
  if (cancellable) return <ChangeSlotDialog booking={{ _id: booking._id, menuItemId: booking.menuItemId, slot: booking.slot }} />
  return <span className="text-xs text-muted-foreground tabular-nums">{t('Retrait à {slot}', { slot: booking.slot })}</span>
}
