import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/** Layout protégé : toute route enfant exige une session valide (vérifiée côté serveur au SSR). */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/auth', search: { redirect: location.href } })
    }
  },
  component: () => <Outlet />,
})
