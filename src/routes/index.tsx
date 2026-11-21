import { createFileRoute, redirect } from '@tanstack/react-router'
import { currentUserQuery } from '#/lib/session'

/** Aiguillage d'arrivée : visiteur vers la connexion, administrateur vers la gestion, autres membres vers l'accueil repas. */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/auth' })
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    throw redirect({ to: user?.membership?.role === 'admin' ? '/admin' : '/app' })
  },
})
