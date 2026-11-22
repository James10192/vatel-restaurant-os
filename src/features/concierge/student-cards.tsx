import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CalendarCheckIcon, CheckIcon, PlusIcon, WalletIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Card } from '../../../convex/lib/concierge/cards'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { AllergenBadges } from '#/features/menus/allergen-badges'
import { AllergyAlert } from '#/features/menus/allergy-alert'
import { BookPicksDialog } from '#/features/smart-menu/book-picks-dialog'
import { UNCOVERED_LABELS } from '#/features/smart-menu/suggestion-results'
import { useLiveOffers } from '#/features/smart-menu/use-live-picks'
import type { LiveOffer } from '#/features/smart-menu/use-live-picks'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayShort, formatXof, todayIso } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'
import { CardFrame } from './card-frame'

type OffersCard = Extract<Card, { kind: 'offers' }>
type PlanCard = Extract<Card, { kind: 'plan' }>

function useBalance() {
  return useQuery(convexQuery(api.wallet.balance, {})).data
}

/** Une offre du menu publié, en direct : prix et places lus en base, réservation par la confirmation habituelle. */
function OfferRow({ offer, balanceXof }: { offer: LiveOffer; balanceXof: number | undefined }) {
  const t = useT()
  const { locale } = useLocale()
  return (
    <li className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{offer.dishName}</span>
          <span className="text-xs text-muted-foreground first-letter:uppercase">
            {formatDayShort(offer.date, locale)}, {t(SERVICE_LABELS[offer.service]).toLowerCase()}
          </span>
        </div>
        <span className="shrink-0 font-semibold tabular-nums">{formatXof(offer.priceXof)}</span>
      </div>
      <AllergenBadges allergens={offer.allergens} />
      <AllergyAlert alert={offer.allergyAlert} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {offer.remaining === 0 ? t('Complet') : t(offer.remaining > 1 ? '{n} portions restantes' : '{n} portion restante', { n: offer.remaining })}
        </span>
        {offer.booked ? (
          <Badge variant="secondary">
            <CheckIcon />
            {t('Réservé')}
          </Badge>
        ) : offer.bookable && balanceXof !== undefined ? (
          <BookMealDialog meal={offer} balanceXof={balanceXof} />
        ) : (
          <span className="text-xs text-muted-foreground">{t('Non réservable')}</span>
        )}
      </div>
    </li>
  )
}

function OfferList({ items }: { items: OffersCard['items'] }) {
  const t = useT()
  const balanceXof = useBalance()
  const { offers, loading } = useLiveOffers(items)
  if (loading) return <Skeleton className="h-28 rounded-2xl" />
  if (offers.length === 0) return <p className="text-sm text-muted-foreground">{t('Ces plats ne sont plus au menu publié.')}</p>
  return (
    <ul className="flex flex-col gap-2">
      {offers.map((offer) => (
        <OfferRow key={offer._id} offer={offer} balanceXof={balanceXof} />
      ))}
    </ul>
  )
}

export function OffersCardView({ card }: { card: OffersCard }) {
  const t = useT()
  return (
    <CardFrame title={t('Menu publié')}>
      <OfferList items={card.items} />
    </CardFrame>
  )
}

export function BalanceCardView() {
  const t = useT()
  const balanceXof = useBalance()
  return (
    <CardFrame title={t('Solde disponible')} icon={WalletIcon}>
      <div className="flex items-center justify-between gap-3">
        {balanceXof === undefined ? <Skeleton className="h-8 w-28" /> : <span className="text-2xl font-semibold tabular-nums">{formatXof(balanceXof)}</span>}
        <Button asChild size="sm" variant="secondary" className="rounded-full">
          <Link to="/app/wallet">
            <PlusIcon data-icon="inline-start" />
            {t('Recharger')}
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('Crédits de démonstration, aucun paiement réel.')}</p>
    </CardFrame>
  )
}

export function BookingsCardView() {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useQuery(convexQuery(api.bookings.mine, { from: todayIso() }))
  const active = data?.filter((b) => b.status === 'confirmed')
  return (
    <CardFrame title={t('Mes réservations')} icon={CalendarCheckIcon}>
      {!active ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('Aucune réservation à venir.')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border text-sm">
          {active.map((b) => (
            <li key={b._id} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{b.dishName}</span>
                <span className="text-xs text-muted-foreground first-letter:uppercase">
                  {formatDayShort(b.date, locale)}, {t(SERVICE_LABELS[b.service]).toLowerCase()}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatXof(b.priceXof)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/app/bookings" className="text-sm font-semibold text-primary underline underline-offset-2">
        {t('Gérer mes repas')}
      </Link>
    </CardFrame>
  )
}

/** Proposition du moteur Aide au choix : total face au budget, jours non couverts, réservation groupée confirmée. */
export function PlanCardView({ card }: { card: PlanCard }) {
  const t = useT()
  const { locale } = useLocale()
  const balanceXof = useBalance()
  const { offers } = useLiveOffers(card.items)
  const toBook = offers.filter((o) => o.bookable && !o.booked).map((o) => ({ ...o, menuItemId: o._id }))
  return (
    <CardFrame title={t('Proposition dans votre budget')} badge="Calculée par les règles">
      <p className="text-sm tabular-nums">
        {t('{total} sur un budget de {budget}.', { total: formatXof(card.totalXof), budget: formatXof(card.budgetXof) })}
      </p>
      <OfferList items={card.items} />
      {card.uncovered.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {card.uncovered.map((day) => (
            <li key={day.date} className="first-letter:uppercase">
              {formatDayShort(day.date, locale)} : {t(UNCOVERED_LABELS[day.reason])}
            </li>
          ))}
        </ul>
      )}
      {toBook.length > 1 && balanceXof !== undefined && <BookPicksDialog picks={toBook} balanceXof={balanceXof} />}
    </CardFrame>
  )
}
