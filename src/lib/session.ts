import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { authClient } from '#/lib/auth-client'

/** Utilisateur connecté et son rattachement, partagé par toutes les routes protégées. */
export const currentUserQuery = convexQuery(api.auth.getCurrentUser, {})

export const ROLE_LABELS = {
  admin: 'Administrateur',
  student: 'Étudiant',
  parent: 'Parent',
  chef: 'Cuisine',
  distribution: 'Distribution',
} as const

export async function signOut() {
  await authClient.signOut()
  window.location.assign('/auth')
}
