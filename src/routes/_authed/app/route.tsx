import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { currentUserQuery } from '#/lib/session'
import { PROFILE_NAV, homeOf, isStaff } from '#/components/shell/nav-model'

/**
 * Espace repas des usagers. Le personnel n'y a pas sa place (son travail est la gestion) : il est renvoyé vers sa
 * page de gestion, sauf pour le profil, commun à tous. Confort seulement : le serveur revérifie chaque rôle.
 */
export const Route = createFileRoute('/_authed/app')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    const role = user?.membership?.role
    if (isStaff(role) && location.pathname.replace(/\/+$/, '') !== PROFILE_NAV.to) throw redirect({ to: homeOf(role) })
  },
  component: Outlet,
})
