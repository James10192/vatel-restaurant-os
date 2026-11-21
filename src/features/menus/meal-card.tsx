import type { FunctionReturnType } from 'convex/server'
import { CircleCheckIcon, MoonIcon, SunIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import { DishVisual } from '#/components/dish-visual'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { cn } from '#/lib/utils'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { CancelBookingDialog } from '#/features/booking/cancel-booking-dialog'
import { AllergenBadges } from './allergen-badges'
import { useT } from '#/i18n/i18n'

export type PublishedItem = FunctionReturnType<typeof api.menus.publishedWeek>[number]
export type MyBooking = FunctionReturnType<typeof api.bookings.mine>[number]

const SERVICE_ICONS = { lunch: SunIcon, dinner: MoonIcon } as const

/** Disponibilité lue sur le serveur ; « peu de portions » sous 20 % de la capacité. */
function availabilityOf(item: PublishedItem, closed: boolean) {
  if (closed) return { label: 'Réservations closes', tone: 'text-muted-foreground' }
  if (item.remaining === 0) return { label: 'Complet', tone: 'text-destructive' }
  const low = item.remaining <= Math.max(1, Math.floor(item.capacity * 0.2))
  return {
    label: item.remaining > 1 ? '{n} portions restantes' : '{n} portion restante',
    tone: low ? 'text-warning' : 'text-success',
  }
}

/** Plat publié, présenté comme une fiche de carte : visuel, service, prix, disponibilité réelle, allergènes, action. */
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
  const t = useT()
  const closed = now >= item.bookableUntil
  const ServiceIcon = SERVICE_ICONS[item.service]
  const availability = availabilityOf(item, closed)

  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-card">
      <div className="relative">
        <DishVisual name={item.dishName} photoUrl={item.photoUrl} className="h-28 text-2xl sm:h-32" />
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-eyebrow text-muted-foreground shadow-card">
          <ServiceIcon className="size-3.5" />
          {t(SERVICE_LABELS[item.service])}
        </span>
        {booking && (
          <Badge className="absolute top-3 right-3">
            <CircleCheckIcon />
            {booking.status === 'picked_up' ? t('Retiré') : t('Réservé')}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl leading-snug font-semibold tracking-tight">{item.dishName}</h3>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <AllergenBadges allergens={item.allergens} />
        {!booking && (
          <div className="flex flex-col gap-1.5">
            <Progress
              value={item.capacity > 0 ? (item.remaining / item.capacity) * 100 : 0}
              aria-label={t(availability.label, { n: item.remaining })}
              className="h-1.5"
            />
            <span className={cn('text-xs font-medium', availability.tone)}>{t(availability.label, { n: item.remaining })}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-5 py-4">
        <span className="text-2xl font-bold tracking-tight whitespace-nowrap text-primary tabular-nums">{formatXof(item.priceXof)}</span>
        {booking ? (
          booking.status === 'confirmed' &&
          now < booking.cancellableUntil && (
            <CancelBookingDialog bookingId={booking._id} dishName={item.dishName} priceXof={booking.priceXof} />
          )
        ) : !closed && item.remaining > 0 && !bookedThisService ? (
          <BookMealDialog meal={item} balanceXof={balanceXof} />
        ) : bookedThisService ? (
          <span className="text-right text-sm text-muted-foreground">{t('Déjà un repas ce service')}</span>
        ) : null}
      </div>
    </Card>
  )
}
