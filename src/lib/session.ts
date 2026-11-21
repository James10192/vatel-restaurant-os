import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient } from '#/lib/auth-client'
import { forgetThisDevice } from '#/lib/push'

/** Utilisateur connecté et son rattachement, partagé par toutes les routes protégées. */
export const currentUserQuery = convexQuery(api.auth.getCurrentUser, {})

export const ROLE_LABELS = {
  admin: 'Administrateur',
  student: 'Étudiant',
  parent: 'Parent',
  chef: 'Cuisine',
  distribution: 'Distribution',
} as const

/**
 * Déconnexion : l'appareil cesse d'abord de recevoir les notifications du compte (appareil partagé),
 * puis la session Better Auth est fermée et la page rechargée sur /auth (aucun état React conservé).
 */
export function useSignOut() {
  const removeDevice = useMutation(api.push.unsubscribe)
  return async () => {
    await forgetThisDevice((endpoint) => removeDevice({ endpoint }))
    await authClient.signOut()
    window.location.assign('/auth')
  }
}
