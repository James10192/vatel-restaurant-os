/**
 * Smart Menu (B1) : suggestion de repas par budget et jours, pour un usager rattaché.
 * Ordre : identité et rôle -> lecture des seules offres publiées de son établissement -> règles
 * déterministes -> IA facultative bornée -> revalidation serveur. Aucune écriture métier :
 * la réservation reste le parcours normal avec confirmation (bookings.book).
 */
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalMutation, internalQuery } from './_generated/server'
import { requireMember } from './lib/access'
import { activeBookingsCount } from './lib/capacity'
import { addDays } from './lib/dates'
import { cutoffAt, policyOf } from './lib/policy'
import { sanitizeWish, selectWithAi } from './lib/smartMenu/llm'
import { configuredModel } from './lib/smartMenu/providers'
import { evaluate, planByRules, validateAiPicks } from './lib/smartMenu/rules'
import type { Plan, SmartRequest } from './lib/smartMenu/rules'
import { QUOTAS, parseRequest, requestArgs, suggestionValidator } from './lib/smartMenu/contract'
import type { Suggestion } from './lib/smartMenu/contract'


const NOTICES = {
  disabled: 'Aide IA non configurée : suggestion calculée sans IA.',
  quota: 'Limite quotidienne de l’aide IA atteinte : suggestion calculée sans IA.',
  failure: 'Aide IA indisponible pour le moment : suggestion calculée sans IA.',
  invalid: 'La proposition de l’IA ne respectait pas vos critères : suggestion calculée sans IA.',
} as const

const todayUtc = (now: number) => new Date(now).toISOString().slice(0, 10)

async function requireStudent(ctx: Parameters<typeof requireMember>[0]) {
  const membership = await requireMember(ctx)
  if (membership.role !== 'student') throw new ConvexError('Aide au choix réservée aux usagers.')
  return membership
}

/** Offres publiées des jours demandés, pour l'établissement de l'appelant uniquement. */
export const context = internalQuery({
  args: { days: v.array(v.string()) },
  handler: async (ctx, { days }) => {
    const membership = await requireStudent(ctx)
    const canteen = await ctx.db.get(membership.canteenId)
    if (!canteen) throw new ConvexError('Établissement introuvable.')
    const policy = policyOf(canteen)
    const perDay = await Promise.all(
      days.map(async (date) => {
        const [items, mine] = await Promise.all([
          ctx.db
            .query('menuItems')
            .withIndex('by_canteen_status_date', (q) =>
              q.eq('canteenId', membership.canteenId).eq('status', 'published').eq('date', date),
            )
            .collect(),
          ctx.db
            .query('bookings')
            .withIndex('by_profile_date', (q) => q.eq('profileId', membership._id).eq('date', date))
            .collect(),
        ])
        const rows = await Promise.all(
          items.map(async (item) => {
            const [dish, booked] = await Promise.all([ctx.db.get(item.dishId), activeBookingsCount(ctx, item._id)])
            if (!dish || dish.canteenId !== membership.canteenId) return []
            return [
              {
                id: item._id,
                date: item.date,
                service: item.service,
                dishName: dish.name,
                description: dish.description,
                priceXof: item.priceXof,
                capacity: item.capacity,
                remaining: Math.max(item.capacity - booked, 0),
                bookableUntil: cutoffAt(policy, item.date, item.service),
                allergens: dish.allergens,
                alreadyBooked: mine.some((b) => b.service === item.service && b.status !== 'cancelled'),
              },
            ]
          }),
        )
        return rows.flat()
      }),
    )
    return perDay.flat()
  },
})

/** Réserve un appel IA dans les quotas ; renvoie null si un plafond est atteint. */
export const reserveAiCall = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Id<'aiUsage'> | null> => {
    const membership = await requireStudent(ctx)
    const day = todayUtc(now)
    const ofCanteen = await ctx.db
      .query('aiUsage')
      .withIndex('by_canteen_day', (q) => q.eq('canteenId', membership.canteenId).eq('day', day))
      .collect()
    if (ofCanteen.reduce((sum, row) => sum + row.calls, 0) >= QUOTAS.perCanteenPerDay) return null
    const mine = ofCanteen.find((row) => row.profileId === membership._id)
    if (mine && mine.calls >= QUOTAS.perStudentPerDay) return null
    if (mine) {
      await ctx.db.patch(mine._id, { calls: mine.calls + 1 })
      return mine._id
    }
    return await ctx.db.insert('aiUsage', {
      canteenId: membership.canteenId,
      profileId: membership._id,
      day,
      calls: 1,
      inputTokens: 0,
      outputTokens: 0,
    })
  },
})

export const recordAiTokens = internalMutation({
  args: { usageId: v.id('aiUsage'), inputTokens: v.number(), outputTokens: v.number() },
  handler: async (ctx, { usageId, inputTokens, outputTokens }) => {
    const membership = await requireStudent(ctx)
    const row = await ctx.db.get(usageId)
    if (!row || row.profileId !== membership._id) return
    await ctx.db.patch(usageId, {
      inputTokens: row.inputTokens + inputTokens,
      outputTokens: row.outputTokens + outputTokens,
    })
  },
})

type AiMetrics = { model?: string; steps: number; inputTokens: number; outputTokens: number }
const NO_AI: AiMetrics = { steps: 0, inputTokens: 0, outputTokens: 0 }

export const suggest = action({
  args: requestArgs,
  returns: suggestionValidator,
  handler: async (ctx, args): Promise<Suggestion> => {
    const started = Date.now()
    const request: SmartRequest = parseRequest(args, todayUtc(started), addDays)
    const rows = await ctx.runQuery(internal.smartMenu.context, { days: request.days })
    const evaluation = evaluate(rows, request, started)
    const answer = (plan: Plan<(typeof rows)[number]>, source: 'ai' | 'rules', notice?: string, ai?: AiMetrics): Suggestion => ({
      source,
      notice,
      budgetXof: request.budgetXof,
      totalXof: plan.totalXof,
      excludedUnknownAllergens: evaluation.excludedUnknownAllergens,
      uncovered: plan.uncovered,
      picks: plan.picks.map(({ offer: { id, alreadyBooked: _alreadyBooked, ...offer }, reason }) => ({ ...offer, menuItemId: id, reason })),
      metrics: { ...(ai ?? NO_AI), latencyMs: Date.now() - started },
    })

    const rulesPlan = planByRules(evaluation, request)
    if (!args.useAi || evaluation.eligibleByDay.size === 0) return answer(rulesPlan, 'rules')
    const config = configuredModel(process.env)
    if (!config) return answer(rulesPlan, 'rules', NOTICES.disabled)
    const usageId = await ctx.runMutation(internal.smartMenu.reserveAiCall, { now: started })
    if (!usageId) return answer(rulesPlan, 'rules', NOTICES.quota)

    try {
      const outcome = await selectWithAi(config.model, evaluation, request, sanitizeWish(args.wish), args.locale ?? 'fr')
      await ctx.runMutation(internal.smartMenu.recordAiTokens, { usageId, ...outcome.usage })
      const ai = { model: config.modelId, steps: outcome.steps, ...outcome.usage }
      const checked = validateAiPicks(outcome.picks, evaluation, request)
      if (checked.ok) return answer(checked.plan, 'ai', undefined, ai)
      console.warn('smartMenu: proposition IA rejetée', checked.problem)
      return answer(rulesPlan, 'rules', NOTICES.invalid, ai)
    } catch (error) {
      // Aucune donnée de requête dans les journaux : seulement le type d'erreur.
      console.warn('smartMenu: échec IA', error instanceof Error ? error.name : 'inconnu')
      return answer(rulesPlan, 'rules', NOTICES.failure, { ...NO_AI, model: config.modelId })
    }
  },
})
