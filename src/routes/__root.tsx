import { HeadContent, Outlet, ScriptOnce, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'
import { THEME_BOOT_SCRIPT } from '#/lib/theme'
import { LOCALE_COOKIE, LocaleProvider, isLocale, useLocale } from '#/i18n/i18n'
// Écoute `beforeinstallprompt` dès le premier chargement (l'événement n'est émis qu'une fois).
import '#/lib/install'
import appCss from '../styles.css?url'
// Même fichier (même empreinte) que celui référencé par le CSS : le précharger évite d'attendre l'analyse du CSS.
import robotoLatin from '@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url'

/** Jeton de session et langue (cookie) lus ensemble côté serveur : premier rendu dans la bonne langue. */
const getBoot = createServerFn({ method: 'GET' }).handler(async () => {
  const lang = getCookie(LOCALE_COOKIE)
  return { token: (await getToken()) ?? null, locale: isLocale(lang) ? lang : ('fr' as const) }
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // Titre de repli : chaque page fixe le sien dans la langue choisie (`pageTitle`).
      { title: 'Vatel Restauration' },
      { name: 'theme-color', content: '#072a5d' },
      { name: 'apple-mobile-web-app-title', content: 'Vatel' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // Police du titre (élément LCP) : en réseau lent elle arrivait ~3 s après le premier affichage (décalages, LCP retardé).
      { rel: 'preload', href: robotoLatin, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo-vatel.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/vatel-apple-touch-180.png' },
    ],
  }),
  beforeLoad: async (ctx) => {
    const { token, locale } = await getBoot()
    if (token) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { isAuthenticated: !!token, token, locale }
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
      <LocaleProvider initial={context.locale}>
        <Document />
      </LocaleProvider>
    </ConvexBetterAuthProvider>
  )
}

function Document() {
  const { locale } = useLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
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
  )
}
