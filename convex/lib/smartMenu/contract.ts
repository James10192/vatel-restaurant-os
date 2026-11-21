/** Smart Menu (B1) : contrat d'entrée/sortie validé, quotas et modèles autorisés. */
import { ConvexError, v } from 'convex/values'
import type { Infer } from 'convex/values'
import { allergenInfoValidator, serviceValidator } from '../../schema'
import { isIsoDate } from '../dates'
import type { SmartRequest } from './rules'

/** Quotas serveur (SEC-05, #16) : jamais uniquement côté interface. */
export const QUOTAS = { perStudentPerDay: 8, perCanteenPerDay: 150 } as const

/**
 * Modèles autorisés via Vercel AI Gateway : outils + sortie structurée, sans entraînement sur les requêtes
 * (catalogue AI Gateway consulté le 21/11/2026). Tout autre identifiant désactive l'IA.
 */
export const ALLOWED_MODELS = ['inception/mercury-3', 'anthropic/claude-haiku-5.5'] as const

export const REQUEST_BOUNDS = { maxDays: 7, horizonDays: 13, maxBudgetXof: 100_000, maxAvoid: 14, maxWishChars: 500 } as const

export const requestArgs = {
  days: v.array(v.string()),
  budgetXof: v.number(),
  service: v.union(serviceValidator, v.literal('any')),
  avoid: v.array(v.string()),
  wish: v.optional(v.string()),
  useAi: v.boolean(),
}

/** Valide la demande : jours réels, à venir, bornés ; budget entier ; listes et texte bornés. */
export function parseRequest(
  args: { days: Array<string>; budgetXof: number; service: SmartRequest['service']; avoid: Array<string>; wish?: string },
  today: string,
  addDays: (iso: string, n: number) => string,
): SmartRequest {
  const days = [...new Set(args.days)].sort()
  const last = addDays(today, REQUEST_BOUNDS.horizonDays)
  if (days.length === 0 || days.length > REQUEST_BOUNDS.maxDays) throw new ConvexError('Choisissez de 1 à 7 jours.')
  if (days.some((day) => !isIsoDate(day) || day < today || day > last)) {
    throw new ConvexError('Choisissez des jours à venir, dans les deux prochaines semaines.')
  }
  if (!Number.isInteger(args.budgetXof) || args.budgetXof <= 0 || args.budgetXof > REQUEST_BOUNDS.maxBudgetXof) {
    throw new ConvexError('Budget invalide : entier positif en FCFA, 100 000 au plus.')
  }
  if (args.avoid.length > REQUEST_BOUNDS.maxAvoid || args.avoid.some((name) => name.length > 40)) {
    throw new ConvexError('Liste d’allergènes à éviter trop longue.')
  }
  if ((args.wish ?? '').length > REQUEST_BOUNDS.maxWishChars) throw new ConvexError('Souhait trop long.')
  return { days, budgetXof: args.budgetXof, service: args.service, avoid: args.avoid }
}

export const suggestionValidator = v.object({
  source: v.union(v.literal('ai'), v.literal('rules')),
  notice: v.optional(v.string()),
  budgetXof: v.number(),
  totalXof: v.number(),
  excludedUnknownAllergens: v.number(),
  uncovered: v.array(
    v.object({
      date: v.string(),
      reason: v.union(v.literal('no_menu'), v.literal('unavailable'), v.literal('allergens'), v.literal('budget')),
    }),
  ),
  picks: v.array(
    v.object({
      menuItemId: v.id('menuItems'),
      date: v.string(),
      service: serviceValidator,
      dishName: v.string(),
      description: v.optional(v.string()),
      priceXof: v.number(),
      capacity: v.number(),
      remaining: v.number(),
      bookableUntil: v.number(),
      allergens: allergenInfoValidator,
      reason: v.optional(v.string()),
    }),
  ),
  metrics: v.object({
    model: v.optional(v.string()),
    latencyMs: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    steps: v.number(),
  }),
})

export type Suggestion = Infer<typeof suggestionValidator>
