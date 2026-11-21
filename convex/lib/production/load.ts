import type { Doc, Id } from '../../_generated/dataModel'
import type { QueryCtx } from '../../_generated/server'
import { addDays } from '../dates'
import type { Recipe } from './plan'
import { WASTE_REASONS, emptyWaste } from './waste'
import type { WasteByReason } from './waste'

/**
 * Lectures de production partagées par l'écran (production.ts) et le copilote (copilot.ts) :
 * les mêmes chiffres partout, toujours bornés à un établissement et à un jour (ou 7 jours).
 */

type Event = Doc<'productionEvents'>
type BookingStatus = Doc<'bookings'>['status']
const SERVICE_ORDER = { lunch: 0, dinner: 1 } as const

/** Cumul des événements d'une offre : préparé (null si jamais saisi) et pertes par motif. */
export function tally(events: Array<Event>) {
  const waste: WasteByReason = emptyWaste()
  let prepared: number | null = null
  let preparedAt: number | null = null
  for (const e of events) {
    if (e.kind === 'prepared') {
      prepared = (prepared ?? 0) + e.portions
      preparedAt = Math.max(preparedAt ?? 0, e._creationTime)
    } else if (e.reason) waste[e.reason] += e.portions
  }
  return { prepared, preparedAt, waste, wasted: WASTE_REASONS.reduce((n, r) => n + waste[r], 0) }
}

/** Fiche technique avec noms lisibles ; null si le plat n'a pas de fiche exploitable. */
async function resolveRecipe(ctx: QueryCtx, dish: Doc<'dishes'> | null): Promise<Recipe | null> {
  if (!dish || dish.recipe.lines.length === 0) return null
  const lines = await Promise.all(
    dish.recipe.lines.map(async (line) => {
      const [ingredient, unit] = await Promise.all([ctx.db.get(line.ingredientId), ctx.db.get(line.unitId)])
      return {
        ingredientId: line.ingredientId,
        name: ingredient?.name ?? 'Ingrédient supprimé',
        unitId: line.unitId,
        unit: unit?.name ?? '?',
        quantity: line.quantity,
        lossPct: line.lossPct ?? 0,
      }
    }),
  )
  return { portions: dish.recipe.portions, lines }
}

/** Situation d'un jour par offre publiée : réservations, préparé, pertes et fiche technique (trois lectures indexées). */
export async function loadProductionDay(ctx: QueryCtx, canteenId: Id<'canteens'>, isoDate: string) {
  const [items, bookings, events] = await Promise.all([
    ctx.db.query('menuItems').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', isoDate)).collect(),
    ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', isoDate)).collect(),
    ctx.db.query('productionEvents').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', isoDate)).collect(),
  ])
  const offers = await Promise.all(
    items
      .filter((item) => item.status === 'published')
      .map(async (item) => {
        const dish = await ctx.db.get(item.dishId)
        const count = (status: BookingStatus) => bookings.filter((b) => b.menuItemId === item._id && b.status === status).length
        const { prepared, preparedAt, waste } = tally(events.filter((e) => e.menuItemId === item._id))
        return {
          menuItemId: item._id,
          service: item.service,
          dishName: dish?.name ?? 'Plat supprimé',
          capacity: item.capacity,
          confirmed: count('confirmed'),
          pickedUp: count('picked_up'),
          cancelled: count('cancelled'),
          prepared,
          preparedAt,
          waste,
          recipe: await resolveRecipe(ctx, dish),
        }
      }),
  )
  return offers.sort((a, b) => SERVICE_ORDER[a.service] - SERVICE_ORDER[b.service] || a.dishName.localeCompare(b.dishName, 'fr'))
}

export type ProductionDayOffer = Awaited<ReturnType<typeof loadProductionDay>>[number]

/** Bilan réel des 7 jours se terminant à `end` : préparé, remis, perdu (deux plages indexées). */
export async function loadWasteWeek(ctx: QueryCtx, canteenId: Id<'canteens'>, end: string) {
  const start = addDays(end, -6)
  const [bookings, events] = await Promise.all([
    ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
    ctx.db.query('productionEvents').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
  ])
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const sum = (kind: Event['kind']) => events.filter((e) => e.date === date && e.kind === kind).reduce((n, e) => n + e.portions, 0)
    const served = bookings.filter((b) => b.date === date && b.status === 'picked_up').length
    return { date, prepared: sum('prepared'), served, wasted: sum('waste') }
  })
}

export type WasteDay = Awaited<ReturnType<typeof loadWasteWeek>>[number]
