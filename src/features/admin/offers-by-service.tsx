import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, MoonIcon, SunIcon } from 'lucide-react'
import { DishVisual } from '#/components/dish-visual'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import type { Service } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { CapacityBar, StatusPill } from './overview'
import type { Offer } from './overview'

const SERVICE_ICONS = { lunch: SunIcon, dinner: MoonIcon } as const

/** Un plat : nom complet (deux lignes au plus), prix, réservés sur capacité, jauge, pastilles de statut. */
function OfferRow({ date, offer }: { date: string; offer: Offer }) {
  const t = useT()
  const booked = offer.confirmed + offer.pickedUp
  return (
    <li>
      <Link
        to="/admin/services"
        search={{ date, item: offer.menuItemId }}
        className="group flex flex-col gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex items-start gap-3">
          <DishVisual name={offer.dishName} className="size-12 shrink-0 rounded-2xl text-sm" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 leading-snug font-semibold">{offer.dishName}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{formatXof(offer.priceXof)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="text-right">
              <span className="block text-lg leading-none font-bold tabular-nums">
                {booked}
                <span className="text-sm font-medium text-muted-foreground"> / {offer.capacity}</span>
              </span>
              <span className="text-[0.6875rem] text-muted-foreground">{t('réservés')}</span>
            </span>
            <ChevronRightIcon
              aria-hidden
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </span>
        <CapacityBar offer={offer} />
        <span className="flex flex-wrap gap-1.5">
          <StatusPill tone="confirmed" value={offer.confirmed} label={t('à servir')} />
          <StatusPill tone="picked_up" value={offer.pickedUp} label={t('remis')} />
          <StatusPill tone="remaining" value={offer.remaining} label={t(offer.remaining > 1 ? 'libres' : 'libre')} />
          {offer.cancelled > 0 && <StatusPill tone="cancelled" value={offer.cancelled} label={t(offer.cancelled > 1 ? 'annulés' : 'annulé')} />}
        </span>
      </Link>
    </li>
  )
}

/** Plats du jour regroupés par service, dans l'ordre de la journée (mobile et tablette ; tableau sur bureau). */
export function OffersByService({ date, offers }: { date: string; offers: Array<Offer> }) {
  const t = useT()
  const services = (Object.keys(SERVICE_LABELS) as Array<Service>)
    .map((service) => ({ service, offers: offers.filter((offer) => offer.service === service) }))
    .filter((group) => group.offers.length > 0)
  return (
    <div className={cn('grid gap-4', services.length > 1 && 'lg:grid-cols-2')}>
      {services.map(({ service, offers: list }) => {
        const Icon = SERVICE_ICONS[service]
        const served = list.reduce((n, o) => n + o.pickedUp, 0)
        const booked = list.reduce((n, o) => n + o.pickedUp + o.confirmed, 0)
        return (
          <section key={service} className="flex flex-col gap-1 rounded-3xl border bg-card p-2 shadow-card">
            <header className="flex items-center gap-3 px-3 pt-3 pb-1">
              <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="size-[1.125rem]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {t(SERVICE_LABELS[service])}
                  <span className="font-normal text-muted-foreground">
                    {' · '}
                    {t(list.length > 1 ? '{n} plats' : '{n} plat', { n: list.length })}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t(booked > 1 ? '{served} remis sur {n} réservations' : '{served} remis sur {n} réservation', {
                    served,
                    n: booked,
                  })}
                </span>
              </span>
            </header>
            <ul className="flex flex-col divide-y divide-border/60">
              {list.map((offer) => (
                <OfferRow key={offer.menuItemId} date={date} offer={offer} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
