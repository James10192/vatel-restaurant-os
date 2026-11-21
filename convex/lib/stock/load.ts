import type { Doc, Id } from '../../_generated/dataModel'
import type { QueryCtx } from '../../_generated/server'
import { addDays, weekDays, weekStartOf } from '../dates'
import { loadProductionDay } from '../production/load'
import { remainingMaterials } from '../production/plan'
import { positionOf } from './position'
import type { Outflow } from './position'
import { convert } from './units'
import { unitNames } from '../names'

/** Jours à couvrir pour les alertes et les achats : d'aujourd'hui à dimanche. */
const remainingDays = (today: string) => {
  const sunday = addDays(weekStartOf(today), 6)
  return weekDays(today, 7).filter((d) => d <= sunday)
}

/**
 * Stock de chaque ingrédient suivi (au moins une réception ou un inventaire), avec le besoin de production
 * jusqu'à dimanche. Lectures indexées par établissement ; la consommation ne lit que les préparations
 * postérieures au plus ancien point de départ (inventaire ou première réception).
 */
export async function loadStock(ctx: QueryCtx, canteenId: Id<'canteens'>, today: string, only?: Id<'ingredients'>) {
  // Un seul ingrédient (inventaire) : lecture indexée de ses seuls mouvements, sans le besoin de la semaine.
  const movements = only
    ? await ctx.db.query('stockMovements').withIndex('by_canteen_ingredient', (q) => q.eq('canteenId', canteenId).eq('ingredientId', only)).collect()
    : await ctx.db.query('stockMovements').withIndex('by_canteen', (q) => q.eq('canteenId', canteenId)).collect()
  const units = await unitNames(ctx, [...new Set(movements.map((m) => m.unitId))])
  const tracked = [...new Set(movements.map((m) => m.ingredientId))]
  const startOf = (ingredientId: Id<'ingredients'>) => {
    const own = movements.filter((m) => m.ingredientId === ingredientId)
    const counts = own.filter((m) => m.kind === 'count')
    return counts.length ? Math.max(...counts.map((m) => m._creationTime)) : Math.min(...own.map((m) => m._creationTime))
  }
  const sinceAt = tracked.length ? Math.min(...tracked.map(startOf)) : Date.now()
  const consumption = await consumptionSince(ctx, canteenId, sinceAt, new Set(tracked))
  const needs = only ? [] : await weekNeeds(ctx, canteenId, today)

  return await Promise.all(
    tracked.map(async (ingredientId) => {
      const own = movements.filter((m) => m.ingredientId === ingredientId)
      const as = (m: Doc<'stockMovements'>) => ({ at: m._creationTime, quantity: m.quantity, unit: units.get(m.unitId) ?? '?' })
      const receptions = own.filter((m) => m.kind === 'reception').map((m) => ({ ...as(m), lotCode: m.lotCode, expiresOn: m.expiresOn, supplier: m.supplier, unitCostXof: m.unitCostXof }))
      const losses: Array<Outflow> = own.filter((m) => m.kind === 'loss').map(as)
      const recipeUnit = consumption.get(ingredientId)?.at(0)?.unit ?? receptions.at(-1)?.unit ?? '?'
      const position = positionOf(recipeUnit, receptions, own.filter((m) => m.kind === 'count').map(as), [...(consumption.get(ingredientId) ?? []), ...losses], Math.min(...own.map((m) => m._creationTime)))
      const need = needs.filter((n) => n.ingredientId === ingredientId)
      const needInUnit = need.map((n) => convert(n.gross, n.unit, position.unit))
      const known = needInUnit.filter((n): n is number => n !== null)
      const ingredient = await ctx.db.get(ingredientId)
      const lastReception = receptions.sort((a, b) => b.at - a.at).at(0)
      return {
        ingredientId,
        name: ingredient?.name ?? 'Ingrédient supprimé',
        ...position,
        // Besoin inconnu (null) si une seule ligne ne se convertit pas : jamais un total partiel présenté comme complet.
        need: known.length === needInUnit.length ? known.reduce((total, n) => total + n, 0) : null,
        lastSupplier: lastReception?.supplier ?? null,
        lastUnitCostXof: lastReception?.unitCostXof ?? null,
      }
    }),
  )
}


/** Consommation théorique : portions préparées (corrections comprises) x quantité brute par portion de la fiche. */
async function consumptionSince(ctx: QueryCtx, canteenId: Id<'canteens'>, sinceAt: number, tracked: Set<Id<'ingredients'>>) {
  const sinceDate = new Date(sinceAt).toISOString().slice(0, 10)
  const events = (await ctx.db.query('productionEvents').withIndex('by_canteen_date', (q) => q.eq('canteenId', canteenId).gte('date', sinceDate)).collect()).filter(
    (e) => e.kind === 'prepared' && e._creationTime > sinceAt,
  )
  // Lectures groupées et en parallèle : chaque offre, plat et unité n'est lu qu'une fois.
  const itemIds = [...new Set(events.map((e) => e.menuItemId))]
  const items = await Promise.all(itemIds.map((id) => ctx.db.get(id)))
  const dishIds = [...new Set(items.flatMap((item) => (item ? [item.dishId] : [])))]
  const dishes = new Map(dishIds.map((id, i) => [id, i]))
  const dishDocs = await Promise.all(dishIds.map((id) => ctx.db.get(id)))
  const recipeOf = (menuItemId: Id<'menuItems'>) => {
    const item = items[itemIds.indexOf(menuItemId)]
    const recipe = item ? dishDocs[dishes.get(item.dishId) ?? -1]?.recipe : undefined
    return recipe && Number.isInteger(recipe.portions) && recipe.portions >= 1 ? recipe : null
  }
  const units = await unitNames(ctx, dishDocs.flatMap((d) => d?.recipe.lines.map((l) => l.unitId) ?? []))
  const out = new Map<Id<'ingredients'>, Array<Outflow>>()
  for (const e of events) {
    const recipe = recipeOf(e.menuItemId)
    if (!recipe) continue
    // Même règle que materialsFor : une ligne invalide (quantité nulle) ne consomme rien.
    for (const line of recipe.lines.filter((l) => tracked.has(l.ingredientId) && l.quantity > 0)) {
      const list = out.get(line.ingredientId) ?? []
      list.push({ at: e._creationTime, quantity: (line.quantity / recipe.portions) * e.portions, unit: units.get(line.unitId) ?? '?' })
      out.set(line.ingredientId, list)
    }
  }
  return out
}

/** Matière brute encore nécessaire d'ici dimanche (même calcul que l'onglet Semaine de Production). */
async function weekNeeds(ctx: QueryCtx, canteenId: Id<'canteens'>, today: string) {
  const days = await Promise.all(remainingDays(today).map(async (date) => ({ date, offers: await loadProductionDay(ctx, canteenId, date) })))
  return remainingMaterials(days, today).materials
}

