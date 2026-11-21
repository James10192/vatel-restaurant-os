import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { currentUserQuery } from '#/lib/session'

/** Espace administration : confort de navigation. Chaque fonction serveur revérifie le rôle. */
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    if (user?.membership?.role !== 'admin') throw redirect({ to: '/app' })
  },
  component: () => <Outlet />,
})
