import { HeadContent, Outlet, ScriptOnce, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'
import { THEME_BOOT_SCRIPT } from '#/lib/theme'
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
      { name: 'theme-color', content: '#072a5d' },
      { name: 'apple-mobile-web-app-title', content: 'Vatel' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo-vatel.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/vatel-apple-touch-180.png' },
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
      <html lang="fr" suppressHydrationWarning>
        <head>
          {/* Applique le thème choisi avant le premier rendu : pas de flash clair/sombre. */}
          <ScriptOnce>{THEME_BOOT_SCRIPT}</ScriptOnce>
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
