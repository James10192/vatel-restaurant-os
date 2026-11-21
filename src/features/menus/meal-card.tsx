import type { FunctionReturnType } from 'convex/server'
import { CircleCheckIcon, MoonIcon, SunIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import { AllergenBadges } from './allergen-badges'

export type PublishedItem = FunctionReturnType<typeof api.menus.publishedWeek>[number]
export type MyBooking = FunctionReturnType<typeof api.bookings.mine>[number]

const SERVICE_ICONS = { lunch: SunIcon, dinner: MoonIcon } as const

/** Plat publié : service, prix, disponibilité réelle, allergènes et action de l'usager. */
export function MealCard({
  item,
  booking,
  bookedThisService,
  balanceXof,
  now,
}: {
  item: PublishedItem
  booking: MyBooking | undefined
  bookedThisService: boolean
  balanceXof: number
  now: number
}) {
  const closed = now >= item.bookableUntil
  const ServiceIcon = SERVICE_ICONS[item.service]
  const availability = closed ? 'Réservations closes' : item.remaining > 0 ? `${item.remaining} portions restantes` : 'Complet'

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <ServiceIcon className="size-4" />
            {SERVICE_LABELS[item.service]}
          </span>
          {booking && (
            <Badge>
              <CircleCheckIcon />
              {booking.status === 'picked_up' ? 'Retiré' : 'Réservé'}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl leading-snug font-semibold tracking-tight">{item.dishName}</h3>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <AllergenBadges allergens={item.allergens} />
        {!booking && (
          <div className="flex flex-col gap-1.5">
            <Progress
              value={item.capacity > 0 ? (item.remaining / item.capacity) * 100 : 0}
              aria-label={availability}
              className="h-1.5"
            />
            <span className="text-xs text-muted-foreground">{availability}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-5 py-4">
        <span className="text-2xl font-bold tracking-tight whitespace-nowrap text-primary tabular-nums">{formatXof(item.priceXof)}</span>
        {booking ? (
          booking.status === 'confirmed' &&
          now < booking.cancellableUntil && (
            <CancelBookingDialog bookingId={booking._id} dishName={item.dishName} priceXof={booking.priceXof} />
          )
        ) : !closed && item.remaining > 0 && !bookedThisService ? (
          <BookMealDialog meal={item} balanceXof={balanceXof} />
        ) : bookedThisService ? (
          <span className="text-sm text-muted-foreground">Déjà un repas ce service</span>
        ) : null}
      </div>
    </Card>
  )
}
