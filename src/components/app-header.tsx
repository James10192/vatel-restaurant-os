import { Link, useMatchRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { UserIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import { AccountMenu } from '#/components/shell/account-menu'
import { ACTIVE_OPTIONS, ADMIN_NAV, MEAL_NAV } from '#/components/shell/nav-model'
import { currentUserQuery } from '#/lib/session'

const GestionIcon = ADMIN_NAV[0].icon
const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground outline-none focus-visible:bg-accent data-[status=active]:text-primary'

/** Barre de navigation du bas, mobile uniquement : cibles tactiles larges, accessible au pouce. */
export function MobileTabBar() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const isAdmin = user?.membership?.role === 'admin'
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MEAL_NAV.map(({ to, short, icon: Icon }) => (
        <Link key={to} to={to} activeOptions={ACTIVE_OPTIONS} className={tabClass}>
          <Icon className="size-5" />
          {short}
        </Link>
      ))}
      {isAdmin && (
        // Un seul onglet pour toute la gestion ; les sous-pages ont leurs onglets en haut de page.
        <Link to="/admin" activeOptions={{ includeSearch: false }} className={tabClass}>
          <GestionIcon className="size-5" />
          Gestion
        </Link>
      )}
      <AccountMenu
        trigger={
          <button type="button" className={tabClass}>
            <UserIcon className="size-5" />
            Profil
          </button>
        }
      />
    </nav>
  )
}

/** Logo intégré au contenu sur mobile, sans bandeau : il défile avec la page. */
export function MobileBrand() {
  // L'accueil porte déjà le logo dans son en-tête de salutation.
  const onHome = useMatchRoute()({ to: '/app' })
  if (onHome) return null
  return (
    <Link to="/app" aria-label="Accueil" className="flex w-full px-4 pt-5 md:hidden">
      <BrandLogo className="h-12" />
    </Link>
  )
}

/** Sous-navigation de la gestion sur mobile : onglets défilants en haut de page (le rail les montre dès la tablette). */
export function AdminMobileTabs() {
  return (
    <nav aria-label="Gestion" className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] md:hidden">
      {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={ACTIVE_OPTIONS}
          className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
