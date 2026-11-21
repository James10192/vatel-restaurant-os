import { Link, useMatchRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BrandLogo } from '#/components/brand-logo'
import { ACTIVE_OPTIONS, ADMIN_NAV, MEAL_NAV, PROFILE_NAV } from '#/components/shell/nav-model'
import { currentUserQuery } from '#/lib/session'
import { useT } from '#/i18n/i18n'

const GestionIcon = ADMIN_NAV[0].icon
const ProfileIcon = PROFILE_NAV.icon
const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground outline-none focus-visible:bg-accent data-[status=active]:text-primary'

/** Barre de navigation du bas, mobile uniquement : cibles tactiles larges, accessible au pouce. */
export function MobileTabBar() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const isAdmin = user?.membership?.role === 'admin'
  return (
    <nav
      aria-label={t('Navigation principale')}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MEAL_NAV.map(({ to, short, icon: Icon }) => (
        <Link key={to} to={to} activeOptions={ACTIVE_OPTIONS} className={tabClass}>
          <Icon className="size-5" />
          {t(short)}
        </Link>
      ))}
      {isAdmin && (
        // Un seul onglet pour toute la gestion ; les sous-pages ont leurs onglets en haut de page.
        <Link to="/admin" activeOptions={{ includeSearch: false }} className={tabClass}>
          <GestionIcon className="size-5" />
          {t('Gestion')}
        </Link>
      )}
      <Link to={PROFILE_NAV.to} activeOptions={ACTIVE_OPTIONS} className={tabClass}>
        <ProfileIcon className="size-5" />
        {t(PROFILE_NAV.short)}
      </Link>
    </nav>
  )
}

/**
 * En-tête mobile des pages, calqué sur l'accueil : icône de la page et intitulé à gauche, logo Vatel à droite.
 * Il défile avec la page (pas de bandeau fixe). L'accueil a son propre en-tête de salutation.
 */
export function MobileBrand() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const matchRoute = useMatchRoute()
  if (matchRoute({ to: '/app' })) return null
  const page = [...MEAL_NAV, PROFILE_NAV, ...ADMIN_NAV].find(({ to }) => matchRoute({ to }))
  const Icon = page?.icon
  return (
    <header className="flex items-center justify-between gap-4 px-4 pt-5 pb-2 md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Icon className="size-5" />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{page ? t(page.label) : t('Vatel Restauration')}</span>
          <span className="truncate text-xs text-muted-foreground">{user?.membership?.canteenName ?? 'Restauration'}</span>
        </div>
      </div>
      <Link to="/app" aria-label={t('Accueil')} className="shrink-0">
        <BrandLogo className="h-12" />
      </Link>
    </header>
  )
}

/** Sous-navigation de la gestion sur mobile : onglets défilants en haut de page (le rail les montre dès la tablette). */
export function AdminMobileTabs() {
  const t = useT()
  return (
    <nav aria-label={t('Gestion')} className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] md:hidden">
      {ADMIN_NAV.map(({ to, short, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={ACTIVE_OPTIONS}
          className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          <Icon className="size-4" />
          {t(short)}
        </Link>
      ))}
    </nav>
  )
}
