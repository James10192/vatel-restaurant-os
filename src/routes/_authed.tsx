import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppHeader, MobileBrand, MobileTabBar } from '#/components/app-header'
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

function AuthedLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 pb-20 md:pb-0">
      <AppHeader />
      <MobileBrand />
      <Outlet />
      <MobileTabBar />
    </div>
  )
}
