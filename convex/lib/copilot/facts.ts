import type { Id } from '../../_generated/dataModel'
import type { QueryCtx } from '../../_generated/server'
import { addDays, todayUtc } from '../dates'
import { suggest, summarizeHistory } from '../production/history'
import { loadDishHistory, loadProductionDay } from '../production/load'
import { expiringLots } from '../stock/position'
import { loadStock } from '../stock/load'
import type { ManagerFacts } from './brief'

/** Fenêtre des « menus à revoir ». */
const MENU_WINDOW_DAYS = 30

/**
 * Faits de gestion pour le copilote, lus avec les mêmes fonctions que les écrans Stocks, Production et
 * Plan : rien de nouveau n'est calculé ici, seulement rassemblé (et borné : demain, 30 jours, stock suivi).
 */
export async function managerFacts(ctx: QueryCtx, canteenId: Id<'canteens'>, day: string): Promise<ManagerFacts> {
  const today = todayUtc()
  const tomorrowDate = addDays(day, 1)
  const [stockRows, tomorrowOffers, menus] = await Promise.all([loadStock(ctx, canteenId, today), loadProductionDay(ctx, canteenId, tomorrowDate), menuStats(ctx, canteenId, today)])
  const stock = stockRows.map((row) => ({
    name: row.name,
    unit: row.unit,
    shortage: row.need !== null && row.need > row.theoretical ? row.need - row.theoretical : 0,
    expiring: expiringLots(row, today, addDays(today, 2)).map((lot) => ({ qty: lot.remaining, day: lot.expiresOn ?? today })),
  }))
  const tomorrow = await Promise.all(
    tomorrowOffers.map(async (offer) => {
      const item = await ctx.db.get(offer.menuItemId)
      const booked = offer.confirmed + offer.pickedUp
      const proposal = item ? suggest(summarizeHistory(await loadDishHistory(ctx, item)), booked) : { walkIns: 0, margin: 0 }
      return { menuItemId: offer.menuItemId, dish: offer.dishName, booked, hasPlan: offer.plan !== null, walkIns: proposal.walkIns, margin: proposal.margin }
    }),
  )
  return { stock, tomorrow, menus }
}

/** Note moyenne et taux de pertes par plat sur les 30 derniers jours (plages indexées). */
async function menuStats(ctx: QueryCtx, canteenId: Id<'canteens'>, today: string) {
  const start = addDays(today, -MENU_WINDOW_DAYS)
  const [items, events, ratings] = await Promise.all([
    ctx.db.query('menuItems').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', today)).collect(),
    ctx.db.query('productionEvents').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', today)).collect(),
    ctx.db.query('ratings').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', start).lte('date', today)).collect(),
  ])
  const dishOf = new Map(items.map((item) => [item._id, item.dishId]))
  const dishIds = [...new Set(items.map((item) => item.dishId))]
  return await Promise.all(
    dishIds.map(async (dishId) => {
      const ofDish = events.filter((e) => dishOf.get(e.menuItemId) === dishId)
      const prepared = ofDish.filter((e) => e.kind === 'prepared').reduce((n, e) => n + e.portions, 0)
      const wasted = ofDish.filter((e) => e.kind === 'waste').reduce((n, e) => n + e.portions, 0)
      const scores = ratings.filter((r) => r.dishId === dishId).map((r) => r.score)
      return {
        dish: (await ctx.db.get(dishId))?.name ?? 'Plat supprimé',
        ratingAvg: scores.length ? Math.round((scores.reduce((n, s) => n + s, 0) / scores.length) * 10) / 10 : null,
        ratingCount: scores.length,
        wasteRate: prepared > 0 ? Math.round((wasted / prepared) * 100) : null,
        prepared,
      }
    }),
  )
}
