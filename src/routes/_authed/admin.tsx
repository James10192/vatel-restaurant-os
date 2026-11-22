import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AdminMobileTabs } from '#/components/app-header'
import { currentUserQuery } from '#/lib/session'
import { normalizePath, staffNav } from '#/components/shell/nav-model'

/**
 * Espace administration. La navigation vient de la coquille commune (rail ou barre latérale, section « Gestion ») ;
 * sur mobile, des onglets en haut de page. Confort seulement : chaque fonction serveur revérifie le rôle.
 */
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    const pages = staffNav(user?.membership?.role)
    if (pages.length === 0) throw redirect({ to: '/app' })
    // Page non ouverte à ce rôle : première page de gestion qui l'est (ex. distribution -> commandes du jour).
    const path = normalizePath(location.pathname)
    if (!pages.some((page) => page.to === path)) throw redirect({ to: pages[0].to })
  },
  component: () => (
    <>
      <AdminMobileTabs />
      <Outlet />
    </>
  ),
})
