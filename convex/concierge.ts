/**
 * Concierge (#45) : conversation avec l'IA, pour un usager (espace repas) ou l'équipe de gestion (cuisine).
 * Ordre : identité et public -> quotas -> modèle avec outils en lecture seule (chaque outil repasse par une
 * fonction Convex qui revérifie identité, rôle et établissement) -> revalidation de la réponse -> cartes.
 * Aucune écriture métier : réserver, recharger ou valider un plan restent les parcours habituels confirmés.
 * L'historique n'est pas conservé (session du navigateur seulement).
 */
import { ConvexError, v } from 'convex/values'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import type { ActionCtx, QueryCtx } from './_generated/server'
import { action, internalMutation, internalQuery } from './_generated/server'
import { requireMember } from './lib/access'
import { addAiTokens, takeAiCall } from './lib/aiQuota'
import { todayUtc } from './lib/dates'
import { localeValidator } from './lib/locale'
import type { Locale } from './lib/locale'
import type { Audience, Reader } from './lib/concierge/capability'
import { replyValidator, uniqueCards } from './lib/concierge/cards'
import type { Reply } from './lib/concierge/cards'
import { checkReply, conciergePrompt, converse, sanitizeHistory, toolsFor } from './lib/concierge/llm'
import type { ToolTrace } from './lib/concierge/llm'
import { QUICK_ACTIONS, QUICK_ACTION_IDS, audienceOf } from './lib/concierge/quick'
import { CAPABILITIES } from './lib/concierge/registry'
import { configuredModel } from './lib/smartMenu/providers'

/** Messages IA par membre et par jour (le plafond d'établissement est commun à toutes les aides IA). */
export const CONCIERGE_DAILY_CALLS = 30

const NOTICES = {
  disabled: 'Aide IA non configurée : utilisez les raccourcis, calculés sans IA.',
  quota: 'Limite quotidienne de l’aide IA atteinte : utilisez les raccourcis, calculés sans IA.',
  failure: 'Aide IA indisponible pour le moment : utilisez les raccourcis, calculés sans IA.',
  invalid: 'La réponse de l’IA n’a pas pu être vérifiée : voici les informations lues par le serveur.',
} as const
const VERIFIED = 'Voici les informations vérifiées par le serveur.'
const NOTHING = 'Je n’ai pas de réponse vérifiée. Essayez un raccourci ci-dessous.'

/** Public du concierge : usager, ou administration et cuisine. La distribution a son propre écran. */
async function requireAudience(ctx: QueryCtx) {
  const membership = await requireMember(ctx)
  const audience = audienceOf(membership.role)
  if (!audience) throw new ConvexError('Assistant réservé aux usagers, à la cuisine et à l’administration.')
  return { membership, audience }
}

export const audience = internalQuery({
  args: {},
  handler: async (ctx): Promise<Audience> => (await requireAudience(ctx)).audience,
})

export const takeCall = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<Id<'aiUsage'> | null> => await takeAiCall(ctx, (await requireAudience(ctx)).membership, now, CONCIERGE_DAILY_CALLS),
})

export const recordTokens = internalMutation({
  args: { usageId: v.id('aiUsage'), inputTokens: v.number(), outputTokens: v.number() },
  handler: async (ctx, { usageId, ...tokens }) => {
    await addAiTokens(ctx, (await requireAudience(ctx)).membership, usageId, tokens)
  },
})

/** Lectures du concierge : les fonctions existantes, appelées avec l'identité de la personne. */
function readerFor(ctx: ActionCtx, now: number): Reader {
  return {
    today: todayUtc(now),
    now,
    offers: (days) => ctx.runQuery(internal.smartMenu.context, { days }),
    balance: () => ctx.runQuery(api.wallet.balance, {}),
    bookings: () => ctx.runQuery(api.bookings.mine, { from: todayUtc(now) }),
    day: async (date) => (await ctx.runQuery(api.production.day, { date })).offers,
    points: (date) => ctx.runQuery(internal.copilot.facts, { date }),
  }
}

/** Raccourci sans IA : la même capacité que l'outil, avec une entrée fixe et une phrase fixe. */
export const quick = action({
  args: { action: v.union(...QUICK_ACTION_IDS.map((id) => v.literal(id))) },
  returns: replyValidator,
  handler: async (ctx, args): Promise<Reply> => {
    const who = await ctx.runQuery(internal.concierge.audience, {})
    const shortcut = QUICK_ACTIONS[args.action]
    if (shortcut.audience !== who) throw new ConvexError('Raccourci indisponible pour votre rôle.')
    const { card } = await CAPABILITIES[who][shortcut.capability].call(readerFor(ctx, Date.now()), shortcut.input)
    return { source: 'rules', text: card ? shortcut.reply : 'Rien à afficher pour le moment.', cards: card ? [card] : [] }
  },
})

const turnValidator = v.object({ role: v.union(v.literal('user'), v.literal('assistant')), text: v.string() })

export const ask = action({
  args: { messages: v.array(turnValidator), locale: v.optional(localeValidator) },
  returns: replyValidator,
  handler: async (ctx, args): Promise<Reply> => {
    const turns = sanitizeHistory(args.messages)
    const who = await ctx.runQuery(internal.concierge.audience, {})
    const rules = (notice: string): Reply => ({ source: 'rules', notice, text: NOTHING, cards: [] })
    const config = configuredModel(process.env)
    if (!config) return rules(NOTICES.disabled)
    const now = Date.now()
    const usageId = await ctx.runMutation(internal.concierge.takeCall, { now })
    if (!usageId) return rules(NOTICES.quota)

    const reader = readerFor(ctx, now)
    const trace: ToolTrace = { cards: [], seen: [] }
    const locale: Locale = args.locale ?? 'fr'
    try {
      const { text, usage } = await converse(config.model, conciergePrompt(who, reader.today, locale), turns, toolsFor(who, reader, trace))
      await ctx.runMutation(internal.concierge.recordTokens, { usageId, ...usage })
      const cards = uniqueCards(trace.cards)
      // Nombres citables : résultats d'outils, messages de la personne, date du jour.
      const checked = checkReply(text, [...trace.seen, ...turns.filter((t) => t.role === 'user').map((t) => t.text), reader.today])
      if (checked.ok) return { source: 'ai', text: checked.text, cards }
      console.warn('concierge: réponse IA rejetée', checked.problem)
      return { source: 'rules', notice: NOTICES.invalid, text: cards.length > 0 ? VERIFIED : NOTHING, cards }
    } catch (error) {
      // Aucune donnée de conversation dans les journaux : seulement le type d'erreur.
      console.warn('concierge: échec IA', error instanceof Error ? error.name : 'inconnu')
      return rules(NOTICES.failure)
    }
  },
})
