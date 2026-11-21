import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AdminMobileTabs } from '#/components/app-header'
import { currentUserQuery } from '#/lib/session'

/**
 * Espace administration. La navigation vient de la coquille commune (rail ou barre latérale, section « Gestion ») ;
 * sur mobile, des onglets en haut de page. Confort seulement : chaque fonction serveur revérifie le rôle.
 */
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    if (user?.membership?.role !== 'admin') throw redirect({ to: '/app' })
  },
  component: () => (
    <>
      <AdminMobileTabs />
      <Outlet />
    </>
  ),
})
