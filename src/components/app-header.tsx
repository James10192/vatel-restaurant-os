import { Link, useMatchRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BrandLogo } from '#/components/brand-logo'
import { InstallIconButton } from '#/components/install-icon-button'
import { ACTIVE_OPTIONS, ADMIN_NAV, MEAL_NAV, PROFILE_NAV, TAB_BAR_PAGES, staffNav } from '#/components/shell/nav-model'
import { currentUserQuery } from '#/lib/session'
import { useT } from '#/i18n/i18n'

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
      <div className="flex shrink-0 items-center gap-2">
        <InstallIconButton />
        <Link to="/app" aria-label={t('Accueil')} className="shrink-0">
          <BrandLogo className="h-12" />
        </Link>
      </div>
    </header>
  )
}

/** Sous-navigation de la gestion sur mobile : onglets défilants en haut de page (le rail les montre dès la tablette). */
export function AdminMobileTabs() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  // Les premières pages sont déjà dans la barre du bas : ici, seulement celles qui n'y tiennent pas.
  const pages = staffNav(user?.membership?.role).slice(TAB_BAR_PAGES)
  if (pages.length === 0) return null
  return (
    <nav aria-label={t('Autres pages')} className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] md:hidden">
      {pages.map(({ to, short, icon: Icon }) => (
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
