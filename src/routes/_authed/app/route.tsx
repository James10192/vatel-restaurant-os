import { Outlet, createFileRoute } from '@tanstack/react-router'
import { MobileBrand } from '#/components/app-header'

/** Espace usager : la navigation vient de la coquille ; sur mobile, le logo est intégré à la page. */
export const Route = createFileRoute('/_authed/app')({
  component: () => (
    <>
      <MobileBrand />
      <Outlet />
    </>
  ),
})
