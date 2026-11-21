import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayLong, formatXof, todayIso } from '#/lib/format'
import { useNow } from '#/lib/use-now'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import type { MyBooking } from '#/features/menus/meal-card'

const STATUS: Record<MyBooking['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  confirmed: { label: 'Confirmée', variant: 'default' },
  picked_up: { label: 'Retirée', variant: 'secondary' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

export const Route = createFileRoute('/_authed/app/bookings')({
  head: () => ({ meta: [{ title: 'Réservations | Vatel Restauration' }] }),
  component: BookingsPage,
})

function BookingsPage() {
  const { data: bookings, isPending } = useQuery(convexQuery(api.bookings.mine, { from: todayIso() }))
  const now = useNow()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-8 md:pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Mes repas</h1>
      {isPending ? (
        <Skeleton className="h-28 rounded-3xl" />
      ) : !bookings?.length ? (
        <Empty className="rounded-3xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheckIcon />
            </EmptyMedia>
            <EmptyTitle>Aucune réservation à venir</EmptyTitle>
            <EmptyDescription>Réservez depuis le menu de la semaine.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        bookings.map((booking) => (
          <Card key={booking._id} className="gap-3 rounded-3xl py-5">
            <CardHeader className="px-4">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{booking.dishName}</CardTitle>
                <Badge variant={STATUS[booking.status].variant}>{STATUS[booking.status].label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground first-letter:uppercase">
                {formatDayLong(booking.date)}, {SERVICE_LABELS[booking.service].toLowerCase()}
              </p>
            </CardHeader>
            <CardContent className="flex items-center justify-between px-4">
              <span className="text-lg font-bold text-primary tabular-nums">{formatXof(booking.priceXof)}</span>
              {booking.status === 'confirmed' && now < booking.cancellableUntil && (
                <CancelBookingDialog bookingId={booking._id} dishName={booking.dishName} priceXof={booking.priceXof} />
              )}
            </CardContent>
          </Card>
        ))
      )}
    </main>
  )
}
