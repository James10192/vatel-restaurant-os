import { useQueries, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { weekStartOf } from '../../../convex/lib/dates'
import type { Suggestion } from './smart-menu-sheet'
import { useNow } from '#/lib/use-now'

type Pick = Suggestion['picks'][number]
export type LivePick = Pick & { booked: boolean; bookable: boolean }

/**
 * Propositions tenues à jour en direct (Convex) : places restantes réelles, repas déjà réservés par l'usager
 * (seul ou en lot), échéance. Une proposition devenue complète n'est plus réservable, sans recharger.
 */
export function useLivePicks(picks: Array<Pick>): Array<LivePick> {
  const now = useNow()
  const weeks = [...new Set(picks.map((p) => weekStartOf(p.date)))]
  const menus = useQueries({ queries: weeks.map((weekStart) => convexQuery(api.menus.publishedWeek, { weekStart })) })
  const from = picks.map((p) => p.date).sort()[0] ?? '2000-01-01'
  const { data: mine } = useQuery(convexQuery(api.bookings.mine, { from }))
  const remaining = new Map(menus.flatMap((q) => q.data ?? []).map((item) => [item._id, item.remaining]))
  return picks.map((pick) => {
    const active = mine?.filter((b) => b.status !== 'cancelled') ?? []
    const booked = active.some((b) => b.menuItemId === pick.menuItemId)
    const serviceTaken = active.some((b) => b.date === pick.date && b.service === pick.service)
    const left = remaining.get(pick.menuItemId) ?? pick.remaining
    return { ...pick, remaining: left, booked, bookable: !serviceTaken && left > 0 && now < pick.bookableUntil }
  })
}
