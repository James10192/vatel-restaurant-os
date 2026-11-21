import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { getOwned, requireKitchen } from './lib/access'
import type { Membership } from './lib/access'
import { addDays } from './lib/dates'
import { assertIdempotencyKey, assertIsoDate } from './lib/validation'
import { MAX_EVENT_PORTIONS, WASTE_REASONS, emptyWaste, maxDeclarableWaste } from './lib/production/waste'
import type { WasteByReason } from './lib/production/waste'
import type { Recipe } from './lib/production/plan'
import { productionDayReturns, wasteWeekReturns } from './lib/production/returns'
import { wasteReasonValidator } from './schema'

type Event = Doc<'productionEvents'>
type BookingStatus = Doc<'bookings'>['status']

const todayUtc = () => new Date(Date.now()).toISOString().slice(0, 10)
const SERVICE_ORDER = { lunch: 0, dinner: 1 } as const

/** Cumul des événements d'une offre : préparé (null si jamais saisi) et pertes par motif. */
function tally(events: Array<Event>) {
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

/**
 * Situation de production d'un jour, par offre publiée : réservations, préparé, pertes et fiche technique.
 * Deux lectures bornées au jour (réservations, journal), regroupées en mémoire. Réactive : une annulation
 * ou une remise met l'écran à jour sans rechargement.
 */
export const day = query({
  args: { date: v.string() },
  returns: productionDayReturns,
  handler: async (ctx, { date }) => {
    const { canteenId } = await requireKitchen(ctx)
    const isoDate = assertIsoDate(date)
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
    offers.sort((a, b) => SERVICE_ORDER[a.service] - SERVICE_ORDER[b.service] || a.dishName.localeCompare(b.dishName, 'fr'))
    return { offers }
  },
})

/** Bilan réel des 7 jours se terminant à `endDate` : préparé, remis, perdu (deux plages indexées). */
export const wasteWeek = query({
  args: { endDate: v.string() },
  returns: wasteWeekReturns,
  handler: async (ctx, { endDate }) => {
    const { canteenId } = await requireKitchen(ctx)
    const end = assertIsoDate(endDate)
    const start = addDays(end, -6)
    const [bookings, events] = await Promise.all([
      ctx.db.query('bookings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end)).collect(),
      ctx.db
        .query('productionEvents')
        .withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', end))
        .collect(),
    ])
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      const sum = (kind: Event['kind']) => events.filter((e) => e.date === date && e.kind === kind).reduce((n, e) => n + e.portions, 0)
      const served = bookings.filter((b) => b.date === date && b.status === 'picked_up').length
      return { date, prepared: sum('prepared'), served, wasted: sum('waste') }
    })
  },
})

/**
 * Contexte commun d'une saisie : offre publiée de l'établissement, d'un jour déjà commencé, et son journal.
 * `duplicate` : la même clé a déjà été enregistrée (double envoi), rien ne doit être ajouté.
 */
async function loadForEntry(ctx: QueryCtx, membership: Membership, menuItemId: Id<'menuItems'>, idempotencyKey: string) {
  const item = await getOwned(ctx, membership, menuItemId)
  if (item.status !== 'published') throw new ConvexError('Offre non publiée.')
  if (item.date > todayUtc()) throw new ConvexError('Saisie impossible pour un jour à venir.')
  const key = assertIdempotencyKey(idempotencyKey)
  const events = await ctx.db.query('productionEvents').withIndex('by_menu_item', (q) => q.eq('menuItemId', menuItemId)).collect()
  const entry = { canteenId: membership.canteenId, menuItemId, date: item.date, service: item.service, profileId: membership._id, idempotencyKey: key }
  return { entry, ...tally(events), duplicate: events.some((e) => e.idempotencyKey === key) }
}

const assertPortions = (value: number, allowNegative: boolean) => {
  const ok = Number.isInteger(value) && value !== 0 && Math.abs(value) <= MAX_EVENT_PORTIONS && (allowNegative || value > 0)
  if (!ok) throw new ConvexError(`Portions : entier entre 1 et ${MAX_EVENT_PORTIONS}.`)
  return value
}

/**
 * Portions préparées (ajout) ou correction (valeur négative). Le total ne descend jamais sous les pertes
 * déjà déclarées. Idempotent : un double envoi avec la même clé n'ajoute rien.
 */
export const recordPrepared = mutation({
  args: { menuItemId: v.id('menuItems'), portions: v.number(), idempotencyKey: v.string() },
  returns: v.object({ prepared: v.number() }),
  handler: async (ctx, { menuItemId, portions, idempotencyKey }) => {
    const membership = await requireKitchen(ctx)
    const { entry, prepared, wasted, duplicate } = await loadForEntry(ctx, membership, menuItemId, idempotencyKey)
    if (duplicate) return { prepared: prepared ?? 0 }
    const next = (prepared ?? 0) + assertPortions(portions, true)
    if (next < wasted) throw new ConvexError(`Correction refusée : ${wasted} portions déjà déclarées perdues.`)
    await ctx.db.insert('productionEvents', { ...entry, kind: 'prepared', portions })
    return { prepared: next }
  },
})

/** Perte réelle avec motif : au plus le préparé qui n'a été ni remis ni déjà déclaré perdu. */
export const recordWaste = mutation({
  args: { menuItemId: v.id('menuItems'), portions: v.number(), reason: wasteReasonValidator, idempotencyKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { menuItemId, portions, reason, idempotencyKey }) => {
    const membership = await requireKitchen(ctx)
    const { entry, prepared, wasted, duplicate } = await loadForEntry(ctx, membership, menuItemId, idempotencyKey)
    if (duplicate) return null
    if (prepared === null) throw new ConvexError('Saisissez d’abord les portions préparées.')
    const served = await ctx.db
      .query('bookings')
      .withIndex('by_menu_item_status', (q) => q.eq('menuItemId', menuItemId).eq('status', 'picked_up'))
      .collect()
    const max = maxDeclarableWaste(prepared, served.length, wasted)
    if (assertPortions(portions, false) > max) throw new ConvexError(`Au plus ${max} portions peuvent encore être déclarées perdues.`)
    await ctx.db.insert('productionEvents', { ...entry, kind: 'waste', portions, reason })
    return null
  },
})
