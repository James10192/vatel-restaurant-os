import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppHeader, MobileBrand } from '#/components/app-header'

/** Espace usager : en-tête sur ordinateur, logo intégré à la page sur mobile. */
export const Route = createFileRoute('/_authed/app')({
  component: () => (
    <>
      <AppHeader />
      <MobileBrand />
      <Outlet />
    </>
  ),
})
