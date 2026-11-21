import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'
import appCss from '../styles.css?url'

const getAuth = createServerFn({ method: 'GET' }).handler(async () => (await getToken()) ?? null)

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Vatel Restauration' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo-vatel.svg' },
    ],
  }),
  beforeLoad: async (ctx) => {
    const token = await getAuth()
    if (token) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { isAuthenticated: !!token, token }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = Route.useRouteContext()
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <html lang="fr">
        <head>
          <HeadContent />
        </head>
        <body className="min-h-dvh bg-background text-foreground antialiased">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  )
}
