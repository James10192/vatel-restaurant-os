import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { GlassTabBar } from '#/components/shell/glass-tab-bar'
import { AppSidebar } from '#/components/shell/app-sidebar'
import { currentUserQuery } from '#/lib/session'

/** Layout protégé : toute route enfant exige une session valide (vérifiée côté serveur au SSR). */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/auth', search: { redirect: location.href } })
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(currentUserQuery),
  component: AuthedLayout,
})

/**
 * Coquille unique : barre du bas (mobile), rail (tablette) ou barre latérale (bureau), selon la largeur, en CSS.
 * Le décalage du contenu suit la largeur de la navigation latérale.
 */
function AuthedLayout() {
  return (
    <div className="flex min-h-svh flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-19 xl:pl-64">
      <AppSidebar />
      <Outlet />
      <GlassTabBar />
    </div>
  )
}
