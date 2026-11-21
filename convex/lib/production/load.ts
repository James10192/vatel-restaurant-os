import type { Doc, Id } from '../../_generated/dataModel'
import type { QueryCtx } from '../../_generated/server'
import { addDays, todayUtc } from '../dates'
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
  const sum = { prepared: 0, recovered: 0, walkin: 0 }
  let preparedAt: number | null = null
  for (const e of events) {
    if (e.kind === 'waste') {
      if (e.reason) waste[e.reason] += e.portions
      continue
    }
    sum[e.kind] += e.portions
    if (e.kind === 'prepared') preparedAt = Math.max(preparedAt ?? 0, e._creationTime)
  }
  return {
    // Préparé jamais saisi : inconnu (null), jamais zéro.
    prepared: events.some((e) => e.kind === 'prepared') ? sum.prepared : null,
    preparedAt,
    waste,
    recovered: sum.recovered,
    walkIns: sum.walkin,
    wasted: WASTE_REASONS.reduce((n, r) => n + waste[r], 0),
  }
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
  const plans = await ctx.db.query('productionPlans').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).eq('date', isoDate)).collect()
  const names = await authorNames(ctx, [...events.map((e) => e.profileId), ...plans.map((p) => p.profileId)])
  // Jour passé : une réservation encore « confirmée » n'a pas été retirée (absence).
  const past = isoDate < todayUtc()
  const offers = await Promise.all(
    items
      .filter((item) => item.status === 'published')
      .map(async (item) => {
        const dish = await ctx.db.get(item.dishId)
        const count = (status: BookingStatus) => bookings.filter((b) => b.menuItemId === item._id && b.status === status).length
        const ofItem = events.filter((e) => e.menuItemId === item._id)
        const { prepared, preparedAt, waste, recovered, walkIns } = tally(ofItem)
        // Dernière validation du plan (les précédentes restent en base : corrections tracées).
        const plan = plans.filter((p) => p.menuItemId === item._id).sort((a, b) => b._creationTime - a._creationTime).at(0)
        return {
          menuItemId: item._id,
          service: item.service,
          dishName: dish?.name ?? 'Plat supprimé',
          capacity: item.capacity,
          confirmed: count('confirmed'),
          pickedUp: count('picked_up'),
          cancelled: count('cancelled'),
          noShow: past ? count('confirmed') : 0,
          prepared,
          preparedAt,
          waste,
          recovered,
          /** Repas servis au comptoir sans réservation (comptés par la distribution). */
          walkIns,
          lots: ofItem
            .filter((e) => e.kind === 'prepared')
            .map((e) => ({ at: e._creationTime, portions: e.portions, by: names.get(e.profileId) ?? 'Membre' })),
          plan: plan
            ? {
                walkIns: plan.walkIns,
                margin: plan.margin,
                bookedAtValidation: plan.bookedAtValidation,
                at: plan._creationTime,
                by: names.get(plan.profileId) ?? 'Membre',
                revisions: plans.filter((p) => p.menuItemId === item._id).length,
              }
            : null,
          recipe: await resolveRecipe(ctx, dish),
        }
      }),
  )
  return offers.sort((a, b) => SERVICE_ORDER[a.service] - SERVICE_ORDER[b.service] || a.dishName.localeCompare(b.dishName, 'fr'))
}

/** Noms affichés des auteurs de saisies (jamais d'e-mail), lus une fois par personne. */
async function authorNames(ctx: QueryCtx, ids: Array<Id<'profiles'>>) {
  const unique = [...new Set(ids)]
  const profiles = await Promise.all(unique.map((id) => ctx.db.get(id)))
  return new Map(unique.map((id, i) => [id, profiles[i]?.displayName ?? 'Membre']))
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
