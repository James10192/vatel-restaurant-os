/**
 * Copilote cuisine (#9) : « que faire maintenant ? » sur l'écran Production.
 * Ordre : identité et rôle cuisine -> chiffres réels du jour (mêmes lectures que l'écran) -> points
 * d'attention déterministes -> IA facultative (ordre + résumé) -> revalidation serveur. Aucune écriture métier.
 */
import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalMutation, internalQuery } from './_generated/server'
import { requireKitchen } from './lib/access'
import { addAiTokens, takeAiCall } from './lib/aiQuota'
import { POINT_KINDS, buildPoints, managerPoints, sortPoints } from './lib/copilot/brief'
import { managerFacts } from './lib/copilot/facts'
import type { Point } from './lib/copilot/brief'
import { checkDraft, draftWithAi } from './lib/copilot/llm'
import { localeValidator } from './lib/locale'
import { loadProductionDay, loadWasteWeek } from './lib/production/load'
import { configuredModel } from './lib/smartMenu/providers'
import { assertIsoDate } from './lib/validation'

/** Appels IA du copilote par membre de la cuisine et par jour (le plafond d'établissement est commun). */
export const COPILOT_DAILY_CALLS = 20

const NOTICES = {
  disabled: 'Aide IA non configurée : points calculés sans IA.',
  quota: 'Limite quotidienne de l’aide IA atteinte : points calculés sans IA.',
  failure: 'Aide IA indisponible pour le moment : points calculés sans IA.',
  invalid: 'Le résumé de l’IA citait des chiffres non vérifiés : points calculés sans IA.',
} as const

export const facts = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }): Promise<Array<Point>> => {
    const { canteenId } = await requireKitchen(ctx)
    const day = assertIsoDate(date)
    const [offers, week, manager] = await Promise.all([loadProductionDay(ctx, canteenId, day), loadWasteWeek(ctx, canteenId, day), managerFacts(ctx, canteenId, day)])
    return sortPoints([...buildPoints(offers, week), ...managerPoints(manager)])
  },
})

export const takeCall = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Id<'aiUsage'> | null> => await takeAiCall(ctx, await requireKitchen(ctx), now, COPILOT_DAILY_CALLS),
})

export const recordTokens = internalMutation({
  args: { usageId: v.id('aiUsage'), inputTokens: v.number(), outputTokens: v.number() },
  handler: async (ctx, { usageId, ...tokens }) => {
    await addAiTokens(ctx, await requireKitchen(ctx), usageId, tokens)
  },
})

const pointValidator = v.object({
  id: v.string(),
  kind: v.union(...POINT_KINDS.map((kind) => v.literal(kind))),
  severity: v.union(v.literal('action'), v.literal('watch'), v.literal('info')),
  message: v.string(),
  values: v.record(v.string(), v.union(v.string(), v.number())),
})

const briefReturns = v.object({
  source: v.union(v.literal('ai'), v.literal('rules')),
  notice: v.optional(v.string()),
  points: v.array(pointValidator),
  summary: v.union(v.null(), v.string()),
  priorities: v.array(v.string()),
})

export type Brief = Infer<typeof briefReturns>

export const brief = action({
  args: { date: v.string(), useAi: v.boolean(), locale: v.optional(localeValidator) },
  returns: briefReturns,
  handler: async (ctx, { date, useAi, locale }): Promise<Brief> => {
    const points = await ctx.runQuery(internal.copilot.facts, { date })
    const rules = (notice?: string) => ({ source: 'rules' as const, notice, points, summary: null, priorities: [] })
    if (!useAi || points.length === 0) return rules()
    const config = configuredModel(process.env)
    if (!config) return rules(NOTICES.disabled)
    const usageId = await ctx.runMutation(internal.copilot.takeCall, { now: Date.now() })
    if (!usageId) return rules(NOTICES.quota)
    try {
      const { draft, usage } = await draftWithAi(config.model, points, locale ?? 'fr')
      await ctx.runMutation(internal.copilot.recordTokens, { usageId, ...usage })
      const checked = checkDraft(draft, points)
      if (!checked.ok) {
        console.warn('copilot: résumé IA rejeté', checked.problem)
        return rules(NOTICES.invalid)
      }
      return { source: 'ai' as const, points, summary: checked.summary, priorities: checked.priorities }
    } catch (error) {
      // Aucune donnée dans les journaux : seulement le type d'erreur.
      console.warn('copilot: échec IA', error instanceof Error ? error.name : 'inconnu')
      return rules(NOTICES.failure)
    }
  },
})
