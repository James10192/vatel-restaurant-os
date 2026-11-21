/**
 * Plan de production (#5) : le chef valide les hypothèses d'une offre (passages sans réservation, marge),
 * en s'appuyant sur l'historique du plat ; la vue semaine prépare les achats. Aucune prévision inventée.
 */
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwned, requireKitchen } from './lib/access'
import { activeBookingsCount } from './lib/capacity'
import { addDays, todayUtc, weekStartOf } from './lib/dates'
import { suggest, summarizeHistory } from './lib/production/history'
import { loadDishHistory, loadProductionDay } from './lib/production/load'
import { dishHistoryReturns, productionWeekReturns } from './lib/production/returns'
import { MAX_EVENT_PORTIONS } from './lib/production/waste'
import { assertIdempotencyKey, assertIsoDate } from './lib/validation'

const assertCount = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0 || value > MAX_EVENT_PORTIONS) throw new ConvexError(`${label} : entier entre 0 et ${MAX_EVENT_PORTIONS}.`)
  return value
}

/**
 * Valide (ou corrige) le plan d'une offre publiée d'aujourd'hui ou à venir. Chaque validation est une nouvelle
 * ligne : l'historique des corrections reste lisible. Idempotent par clé.
 */
export const validatePlan = mutation({
  args: { menuItemId: v.id('menuItems'), walkIns: v.number(), margin: v.number(), idempotencyKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { menuItemId, walkIns, margin, idempotencyKey }) => {
    const membership = await requireKitchen(ctx)
    const item = await getOwned(ctx, membership, menuItemId)
    if (item.status !== 'published') throw new ConvexError('Offre non publiée.')
    if (item.date < todayUtc()) throw new ConvexError('Ce service est passé : le plan ne se modifie plus.')
    const key = assertIdempotencyKey(idempotencyKey)
    const previous = await ctx.db.query('productionPlans').withIndex('by_menu_item', (q) => q.eq('menuItemId', menuItemId)).collect()
    if (previous.some((p) => p.idempotencyKey === key)) return null
    await ctx.db.insert('productionPlans', {
      canteenId: membership.canteenId,
      menuItemId,
      date: item.date,
      walkIns: assertCount(walkIns, 'Passages sans réservation'),
      margin: assertCount(margin, 'Marge de sécurité'),
      bookedAtValidation: await activeBookingsCount(ctx, menuItemId),
      profileId: membership._id,
      idempotencyKey: key,
    })
    return null
  },
})

/** Historique des services passés du même plat, et proposition de marge par règles (démarrage à froid signalé). */
export const dishHistory = query({
  args: { menuItemId: v.id('menuItems') },
  returns: dishHistoryReturns,
  handler: async (ctx, { menuItemId }) => {
    const membership = await requireKitchen(ctx)
    const item = await getOwned(ctx, membership, menuItemId)
    const services = await loadDishHistory(ctx, item)
    const history = summarizeHistory(services)
    return { history, suggestion: suggest(history, await activeBookingsCount(ctx, menuItemId)), services }
  },
})

/** Semaine de production (lundi à dimanche) : mêmes chiffres que la vue du jour, pour préparer achats et sorties. */
export const week = query({
  args: { weekStart: v.string() },
  returns: productionWeekReturns,
  handler: async (ctx, { weekStart }) => {
    const { canteenId } = await requireKitchen(ctx)
    const monday = weekStartOf(assertIsoDate(weekStart))
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    return await Promise.all(days.map(async (date) => ({ date, offers: await loadProductionDay(ctx, canteenId, date) })))
  },
})
