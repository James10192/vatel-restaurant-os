import { Outlet, createFileRoute } from '@tanstack/react-router'

/** Espace usager : navigation et en-tête mobile viennent de la coquille (`_authed`). */
export const Route = createFileRoute('/_authed/app')({
  component: Outlet,
})
