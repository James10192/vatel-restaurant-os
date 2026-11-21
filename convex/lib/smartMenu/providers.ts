/**
 * Smart Menu (B1) : choix du fournisseur et du modèle, côté serveur uniquement.
 * Variables Convex : SMART_MENU_PROVIDER (gateway | openrouter), SMART_MENU_MODEL et la clé du fournisseur.
 * Tout identifiant hors liste blanche, ou clé absente, désactive l'IA (repli sans IA).
 */
import { createGateway } from 'ai'
import type { LanguageModel } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

/**
 * Modèles autorisés : outils + sortie structurée, sans entraînement sur les requêtes
 * (catalogues AI Gateway et OpenRouter consultés le 21/11/2026). Mercury 3 n'existe pas sur OpenRouter.
 */
export const ALLOWED_MODELS = {
  gateway: ['inception/mercury-3', 'anthropic/claude-haiku-5.5'],
  openrouter: ['anthropic/claude-haiku-5.5'],
} as const

type Provider = keyof typeof ALLOWED_MODELS
type Env = Record<string, string | undefined>

const isProvider = (value: string | undefined): value is Provider => value === 'gateway' || value === 'openrouter'

export function configuredModel(env: Env): { modelId: string; model: LanguageModel } | null {
  const provider = env.SMART_MENU_PROVIDER ?? 'gateway'
  const modelId = env.SMART_MENU_MODEL
  if (!isProvider(provider) || !modelId || !(ALLOWED_MODELS[provider] as ReadonlyArray<string>).includes(modelId)) return null
  if (provider === 'openrouter') {
    const apiKey = env.OPENROUTER_API_KEY
    if (!apiKey) return null
    // Refuse les fournisseurs qui conservent ou réutilisent les requêtes ; exige le support des outils.
    const model = createOpenRouter({ apiKey })(modelId, {
      provider: { data_collection: 'deny', require_parameters: true },
    })
    return { modelId: `openrouter/${modelId}`, model }
  }
  const apiKey = env.AI_GATEWAY_API_KEY
  if (!apiKey) return null
  return { modelId: `gateway/${modelId}`, model: createGateway({ apiKey })(modelId) }
}
