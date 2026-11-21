import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { getOwned, requireKitchen } from './lib/access'
import { todayUtc } from './lib/dates'
import type { Membership } from './lib/access'
import { assertIdempotencyKey, assertIsoDate } from './lib/validation'
import { MAX_EVENT_PORTIONS, maxDeclarableWaste } from './lib/production/waste'
import { loadProductionDay, loadWasteWeek, tally } from './lib/production/load'
import { productionDayReturns, wasteWeekReturns } from './lib/production/returns'
import { wasteReasonValidator } from './schema'


/**
 * Situation de production d'un jour, par offre publiée : réservations, préparé, pertes et fiche technique.
 * Réactive : une annulation ou une remise met l'écran à jour sans rechargement.
 */
export const day = query({
  args: { date: v.string() },
  returns: productionDayReturns,
  handler: async (ctx, { date }) => {
    const { canteenId } = await requireKitchen(ctx)
    return { offers: await loadProductionDay(ctx, canteenId, assertIsoDate(date)) }
  },
})

/** Bilan réel des 7 jours se terminant à `endDate` : préparé, remis, perdu. */
export const wasteWeek = query({
  args: { endDate: v.string() },
  returns: wasteWeekReturns,
  handler: async (ctx, { endDate }) => {
    const { canteenId } = await requireKitchen(ctx)
    return await loadWasteWeek(ctx, canteenId, assertIsoDate(endDate))
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
