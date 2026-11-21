import { describe, expect, test } from 'vitest'
import { configuredModel } from './providers'

describe('choix du fournisseur IA', () => {
  test('OpenRouter : modèle autorisé et clé présente', () => {
    const config = configuredModel({ SMART_MENU_PROVIDER: 'openrouter', SMART_MENU_MODEL: 'anthropic/claude-haiku-5.5', OPENROUTER_API_KEY: 'factice' })
    expect(config?.modelId).toBe('openrouter/anthropic/claude-haiku-5.5')
  })

  test('désactivé : clé absente, modèle hors liste, fournisseur inconnu ou modèle gratuit qui conserve les données', () => {
    expect(configuredModel({ SMART_MENU_PROVIDER: 'openrouter', SMART_MENU_MODEL: 'anthropic/claude-haiku-5.5' })).toBeNull()
    expect(configuredModel({ SMART_MENU_PROVIDER: 'openrouter', SMART_MENU_MODEL: 'nvidia/nemotron-3.5-super-vl:free', OPENROUTER_API_KEY: 'x' })).toBeNull()
    expect(configuredModel({ SMART_MENU_PROVIDER: 'openrouter', SMART_MENU_MODEL: 'inception/mercury-3', OPENROUTER_API_KEY: 'x' })).toBeNull()
    expect(configuredModel({ SMART_MENU_PROVIDER: 'autre', SMART_MENU_MODEL: 'anthropic/claude-haiku-5.5', OPENROUTER_API_KEY: 'x' })).toBeNull()
  })

  test('AI Gateway par défaut si aucun fournisseur précisé', () => {
    const config = configuredModel({ SMART_MENU_MODEL: 'inception/mercury-3', AI_GATEWAY_API_KEY: 'x' })
    expect(config?.modelId).toBe('gateway/inception/mercury-3')
  })
})
