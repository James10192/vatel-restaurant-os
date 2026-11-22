import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChefHatIcon, FlaskConicalIcon, ListChecksIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Card } from '../../../convex/lib/concierge/cards'
import { dayTotals } from '../../../convex/lib/production/plan'
import { PointList } from '#/features/production/point-list'
import { SimulationVerdict } from '#/features/production/simulation-result'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayShort } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'
import { CardFrame } from './card-frame'

type DayCard = Extract<Card, { kind: 'day' }>
type SimulationCard = Extract<Card, { kind: 'simulation' }>
type PointsCard = Extract<Card, { kind: 'points' }>

/** Chiffres réels d'un jour, en direct : une remise ou une annulation met la carte à jour. */
export function DayCardView({ card }: { card: DayCard }) {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useQuery(convexQuery(api.production.day, { date: card.date }))
  const offers = data?.offers
  const totals = dayTotals(offers ?? [])
  const tiles = [
    { label: 'Réservées', value: totals.booked },
    { label: 'Remises', value: totals.pickedUp },
    { label: 'Préparées', value: totals.prepared },
    { label: 'Demande prévue', value: totals.demand },
  ]
  return (
    <CardFrame title={t('Chiffres du {day}', { day: formatDayShort(card.date, locale) })} icon={ChefHatIcon}>
      {!offers ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            {tiles.map(({ label, value }) => (
              <div key={label} className="flex flex-col rounded-2xl bg-muted/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{t(label)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{value ?? t('Non saisi')}</dd>
              </div>
            ))}
          </dl>
          <ul className="flex flex-col divide-y rounded-2xl border text-sm">
            {offers.map((o) => (
              <li key={o.menuItemId} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{o.dishName}</span>
                  <span className="text-xs text-muted-foreground">{t(SERVICE_LABELS[o.service])}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {t('{booked} sur {capacity}', { booked: o.confirmed + o.pickedUp, capacity: o.capacity })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to="/admin/production" search={{ date: card.date }} className="text-sm font-semibold text-primary underline underline-offset-2">
        {t('Ouvrir la production')}
      </Link>
    </CardFrame>
  )
}

/** Simulation : hypothèse affichée comme telle, calcul déterministe, aucune modification. */
export function SimulationCardView({ card }: { card: SimulationCard }) {
  const t = useT()
  const { locale } = useLocale()
  return (
    <CardFrame title={t('Simulation du {day}', { day: formatDayShort(card.date, locale) })} icon={FlaskConicalIcon} badge="Hypothèse, rien n’est modifié">
      <p className="text-xs text-muted-foreground">
        {t('{absences} absences, {arrivals} arrivées en plus', { absences: card.cancellations, arrivals: card.arrivals })}
        {card.preparedAssumed !== null && `, ${t('{n} portions préparées supposées', { n: card.preparedAssumed })}`}
      </p>
      <SimulationVerdict result={card} capacity={card.capacity} />
      {!card.preparedKnown && <p className="text-xs text-muted-foreground">{t('Préparé inconnu : le calcul repose sur votre hypothèse.')}</p>}
    </CardFrame>
  )
}

export function PointsCardView({ card }: { card: PointsCard }) {
  const t = useT()
  return (
    <CardFrame title={t('Points d’attention')} icon={ListChecksIcon} badge="Calculés par les règles">
      <PointList points={card.points} date={card.date} />
    </CardFrame>
  )
}
