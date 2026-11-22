import { useQueries, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { weekStartOf } from '../../../convex/lib/dates'
import type { Suggestion } from './smart-menu-sheet'
import type { PublishedItem } from '#/features/menus/meal-card'
import { useNow } from '#/lib/use-now'

type SuggestedPick = Suggestion['picks'][number]
export type LivePick = SuggestedPick & { booked: boolean; bookable: boolean }
/** Ce qu'il faut pour confirmer une réservation (groupée ou non). */
export type BookablePick = Pick<LivePick, 'menuItemId' | 'dishName' | 'date' | 'service' | 'priceXof'>
export type LiveOffer = PublishedItem & { booked: boolean; bookable: boolean }

/**
 * Menu publié et réservations de l'usager sur les jours donnés, en direct (Convex) : places restantes réelles,
 * repas déjà réservés (seul ou en lot), échéance. Base commune des propositions et des cartes de l'assistant.
 */
function useLiveMenu(dates: Array<string>) {
  const now = useNow()
  const weeks = [...new Set(dates.map(weekStartOf))]
  const menus = useQueries({ queries: weeks.map((weekStart) => convexQuery(api.menus.publishedWeek, { weekStart })) })
  const from = [...dates].sort()[0] ?? '2000-01-01'
  const mine = useQuery(convexQuery(api.bookings.mine, { from }))
  const items = new Map(menus.flatMap((q) => q.data ?? []).map((item) => [item._id, item]))
  const active = mine.data?.filter((b) => b.status !== 'cancelled') ?? []
  const state = (menuItemId: Id<'menuItems'>, date: string, service: PublishedItem['service'], remaining: number, bookableUntil: number) => {
    const booked = active.some((b) => b.menuItemId === menuItemId)
    const serviceTaken = active.some((b) => b.date === date && b.service === service)
    return { booked, bookable: !serviceTaken && remaining > 0 && now < bookableUntil }
  }
  return { items, state, loading: mine.isPending || menus.some((q) => q.isPending) }
}

/** Propositions de l'Aide au choix tenues à jour : une proposition devenue complète n'est plus réservable. */
export function useLivePicks(picks: Array<SuggestedPick>): Array<LivePick> {
  const { items, state } = useLiveMenu(picks.map((p) => p.date))
  return picks.map((pick) => {
    const remaining = items.get(pick.menuItemId)?.remaining ?? pick.remaining
    return { ...pick, remaining, ...state(pick.menuItemId, pick.date, pick.service, remaining, pick.bookableUntil) }
  })
}

/** Offres citées par l'assistant, lues en direct ; une offre retirée du menu publié disparaît. */
export function useLiveOffers(refs: Array<{ menuItemId: Id<'menuItems'>; date: string }>) {
  const { items, state, loading } = useLiveMenu(refs.map((r) => r.date))
  const offers = refs.flatMap(({ menuItemId }): Array<LiveOffer> => {
    const item = items.get(menuItemId)
    return item ? [{ ...item, ...state(item._id, item.date, item.service, item.remaining, item.bookableUntil) }] : []
  })
  return { offers, loading }
}
