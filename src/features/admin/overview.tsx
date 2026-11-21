import { Link } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import { ArrowRightIcon, ChevronRightIcon, CircleSlashIcon, ClockIcon, HandPlatterIcon, SoupIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import { DishVisual } from '#/components/dish-visual'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import type { Service } from '#/lib/format'
import { cn } from '#/lib/utils'

type Summary = FunctionReturnType<typeof api.admin.daySummary>
type Offer = Summary['offers'][number]
type OrderStatus = 'confirmed' | 'picked_up' | 'cancelled'

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/**
 * Jauge segmentée d'une capacité : remis, à servir, libres. Une seule lecture, de gauche à droite,
 * au lieu de trois chiffres à additionner. `onBrand` : posée sur la surface bleu Vatel.
 */
export function CapacityBar({ offer, onBrand = false }: { offer: Pick<Offer, 'pickedUp' | 'confirmed' | 'capacity'>; onBrand?: boolean }) {
  const segments = [
    { value: offer.pickedUp, className: onBrand ? 'bg-white' : 'bg-success' },
    {
      value: offer.confirmed,
      className: onBrand ? 'bg-vatel-sky' : 'bg-primary',
    },
  ]
  return (
    <div
      role="img"
      aria-label={`${offer.pickedUp} remis, ${offer.confirmed} à servir, sur ${offer.capacity} portions`}
      className={cn('flex h-2 w-full overflow-hidden rounded-full', onBrand ? 'bg-white/15' : 'bg-muted')}
    >
      {segments.map((segment, i) => (
        <span
          key={i}
          className={cn('h-full motion-safe:transition-[width] motion-safe:duration-500', segment.className)}
          style={{ width: `${percent(segment.value, offer.capacity)}%` }}
        />
      ))}
    </div>
  )
}

function Legend({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={cn('size-2 rounded-full', className)} />
      <span className="tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  )
}

/** Carte maîtresse : où en est le service, en un coup d'œil, et l'action suivante. */
export function ServiceHero({ date, dayLabel, totals }: { date: string; dayLabel: string; totals: Summary['totals'] }) {
  const booked = totals.confirmed + totals.pickedUp
  return (
    // Surface de marque : bleu Vatel foncé dans les deux thèmes (en sombre, --primary devient bleu clair).
    <section className="relative isolate overflow-hidden rounded-3xl bg-vatel-navy p-6 text-white shadow-lg shadow-vatel-navy/25 ring-1 ring-white/10 md:p-8">
      <div aria-hidden className="absolute -top-20 -right-20 -z-10 size-72 rounded-full border-[28px] border-white/10" />
      <div aria-hidden className="absolute right-24 -bottom-24 -z-10 size-48 rounded-full bg-white/5" />
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow text-white/70">Service {dayLabel}</p>
          <p className="flex items-baseline gap-3">
            <span className="text-6xl font-bold tracking-[-0.04em] tabular-nums md:text-7xl">
              {percent(booked, totals.capacity)}
              <span className="text-3xl md:text-4xl">%</span>
            </span>
            <span className="max-w-40 text-sm leading-snug text-white/80">des portions réservées</span>
          </p>
          <p className="text-sm text-white/80">
            <span className="font-semibold text-white tabular-nums">{booked}</span> sur{' '}
            <span className="tabular-nums">{plural(totals.capacity, 'portion')}</span> proposée
            {totals.capacity > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <Badge variant="secondary" className="tabular-nums">
            {formatXof(totals.demoAmountXof)} en crédits démo
          </Badge>
          <Button variant="secondary" size="lg" asChild>
            <Link
              to="/admin/services"
              search={{
                date,
                status: totals.confirmed > 0 ? 'confirmed' : undefined,
              }}
            >
              {totals.confirmed > 0 ? `Servir ${totals.confirmed} repas` : 'Voir les commandes'}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <CapacityBar offer={totals} onBrand />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Legend className="bg-white" label="remis" value={totals.pickedUp} />
          <Legend className="bg-vatel-sky" label="à servir" value={totals.confirmed} />
          <Legend className="border border-white/60" label="libres" value={totals.remaining} />
        </div>
      </div>
    </section>
  )
}

const STATS: {
  key: 'confirmed' | 'pickedUp' | 'cancelled' | 'remaining'
  label: string
  icon: LucideIcon
  status?: OrderStatus
}[] = [
  { key: 'confirmed', label: 'À servir', icon: ClockIcon, status: 'confirmed' },
  {
    key: 'pickedUp',
    label: 'Remis',
    icon: HandPlatterIcon,
    status: 'picked_up',
  },
  {
    key: 'cancelled',
    label: 'Annulés',
    icon: CircleSlashIcon,
    status: 'cancelled',
  },
  { key: 'remaining', label: 'Libres', icon: SoupIcon },
]

/** Quatre chiffres compacts ; chacun ouvre les commandes déjà filtrées sur ce statut. */
export function StatTiles({ date, totals }: { date: string; totals: Summary['totals'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map(({ key, label, icon: Icon, status }) => {
        const body = (
          <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2xl leading-none font-bold tracking-tight tabular-nums">{totals[key]}</span>
              <span className="text-sm leading-tight text-muted-foreground">{label}</span>
            </span>
          </>
        )
        const tile = 'flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-card'
        return status ? (
          <Link
            key={key}
            to="/admin/services"
            search={{ date, status }}
            className={cn(
              tile,
              'press transition-colors hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            )}
          >
            {body}
          </Link>
        ) : (
          <div key={key} className={tile}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

function OfferRow({ date, offer }: { date: string; offer: Offer }) {
  return (
    <li>
      <Link
        to="/admin/services"
        search={{ date, item: offer.menuItemId }}
        className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <DishVisual name={offer.dishName} className="size-14 shrink-0 rounded-2xl text-base" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold">{offer.dishName}</span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{formatXof(offer.priceXof)}</span>
          </div>
          <CapacityBar offer={offer} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Legend className="bg-success" label="remis" value={offer.pickedUp} />
            <Legend className="bg-primary" label="à servir" value={offer.confirmed} />
            <span className="tabular-nums">
              {offer.remaining} / {offer.capacity} libres
            </span>
            {offer.cancelled > 0 && <span className="tabular-nums">{plural(offer.cancelled, 'annulation')}</span>}
          </div>
        </div>
        <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  )
}

/** Plats du jour regroupés par service, dans l'ordre de la journée. */
export function OffersByService({ date, offers }: { date: string; offers: Offer[] }) {
  const services = (Object.keys(SERVICE_LABELS) as Service[])
    .map((service) => ({
      service,
      offers: offers.filter((offer) => offer.service === service),
    }))
    .filter((group) => group.offers.length > 0)
  return (
    <div className={cn('grid gap-4', services.length > 1 && 'lg:grid-cols-2')}>
      {services.map(({ service, offers: list }) => {
        const served = list.reduce((n, o) => n + o.pickedUp, 0)
        const booked = list.reduce((n, o) => n + o.pickedUp + o.confirmed, 0)
        return (
          <Card key={service} className="gap-2 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>{SERVICE_LABELS[service]}</CardTitle>
                <CardDescription className="tabular-nums">
                  {served} remis sur {plural(booked, 'réservation')}
                </CardDescription>
              </div>
              <Badge variant="outline">{plural(list.length, 'plat')}</Badge>
            </CardHeader>
            <CardContent className="px-3">
              <ul className="flex flex-col">
                {list.map((offer) => (
                  <OfferRow key={offer.menuItemId} date={date} offer={offer} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
