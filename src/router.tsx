import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { routeTree } from './routeTree.gen'
import { ListSkeleton } from '#/components/page-skeleton'

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!convexUrl) throw new Error('VITE_CONVEX_URL manquant (lancer pnpm exec convex dev)')

  const convexQueryClient = new ConvexQueryClient(convexUrl, { expectAuth: true })
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { queryKeyHashFn: convexQueryClient.hashFn(), queryFn: convexQueryClient.queryFn() },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, convexQueryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Navigation qui attend ses données : silhouette de la nouvelle page presque tout de suite (jamais figé sur
    // l'ancienne), affichée au moins un instant pour éviter un clignotement quand la réponse arrive juste après.
    defaultPendingMs: 150,
    defaultPendingMinMs: 350,
    defaultPendingComponent: ListSkeleton,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
