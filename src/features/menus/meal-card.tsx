import type { FunctionReturnType } from 'convex/server'
import { CircleCheckIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import { AllergenBadges } from './allergen-badges'

export type PublishedItem = FunctionReturnType<typeof api.menus.publishedWeek>[number]
export type MyBooking = FunctionReturnType<typeof api.bookings.mine>[number]

/** Plat publié : prix, disponibilité, allergènes, et l'action possible pour l'usager. */
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
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit">
              {SERVICE_LABELS[item.service]}
            </Badge>
            <CardTitle className="text-base">{item.dishName}</CardTitle>
          </div>
          <span className="shrink-0 text-lg font-bold text-primary">{formatXof(item.priceXof)}</span>
        </div>
        {item.description && <CardDescription>{item.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
        <AllergenBadges allergens={item.allergens} />
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 px-4">
        {booking ? (
          <>
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <CircleCheckIcon className="size-4" />
              {booking.status === 'picked_up' ? 'Repas retiré' : 'Réservé'}
            </span>
            {booking.status === 'confirmed' && now < booking.cancellableUntil && (
              <CancelBookingDialog bookingId={booking._id} dishName={item.dishName} priceXof={booking.priceXof} />
            )}
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              {closed ? 'Réservations closes' : item.remaining > 0 ? `${item.remaining} portions restantes` : 'Complet'}
            </span>
            {!closed && item.remaining > 0 && !bookedThisService && (
              <BookMealDialog meal={item} balanceXof={balanceXof} />
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
