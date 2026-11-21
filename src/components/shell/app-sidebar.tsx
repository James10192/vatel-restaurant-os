import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronsUpDownIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { ROLE_LABELS, currentUserQuery } from '#/lib/session'
import { AccountMenu } from './account-menu'
import { ACTIVE_OPTIONS, MEAL_NAV, initials, staffNav } from './nav-model'
import type { NavItem } from './nav-model'
import { useT } from '#/i18n/i18n'

/**
 * Navigation latérale adaptative, une seule implémentation, pilotée par CSS (aucune mesure JS, donc SSR sûr) :
 * - < 768 px : masquée, la barre du bas prend le relais ;
 * - 768 à 1279 px : rail d'icônes de 76 px, libellés courts sous l'icône (tablette, tactile) ;
 * - ≥ 1280 px : barre latérale de 256 px, sections titrées, compte en pied (logiciel de bureau).
 */
export function AppSidebar() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const staff = staffNav(user?.membership?.role)
  const isStaff = staff.length > 0
  return (
    <aside
      aria-label={t('Navigation principale')}
      className="fixed inset-y-0 left-0 z-30 hidden w-19 flex-col gap-4 border-r bg-sidebar py-4 text-sidebar-foreground md:flex xl:w-64 xl:px-3"
    >
      <Link to={isStaff ? staff[0].to : '/app'} aria-label={t('Accueil')} className="flex items-center justify-center gap-3 xl:justify-start xl:px-2">
        <BrandLogo className="h-10 shrink-0" />
        <span className="hidden flex-col leading-tight xl:flex">
          <span className="text-sm font-semibold">{t('Restauration')}</span>
          <span className="text-xs text-muted-foreground">{user?.membership?.canteenName ?? 'Vatel'}</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 xl:px-0">
        {/* Administrateur : la gestion est son travail, l'espace repas reste accessible (il peut aussi réserver). */}
        {isStaff && <NavSection title={t('Gestion')} items={staff} />}
        <NavSection title={isStaff ? 'Mon espace repas' : 'Espace repas'} items={MEAL_NAV} divider={isStaff} />
      </nav>

      <AccountMenu
        side="right"
        trigger={
          <button
            type="button"
            aria-label={t('Mon compte')}
            className="mx-auto flex items-center gap-3 rounded-2xl p-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 xl:mx-0 xl:w-full xl:px-2"
          >
            <Avatar>
              <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 flex-1 flex-col xl:flex">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.membership ? t(ROLE_LABELS[user.membership.role]) : t('Non rattaché')}
              </span>
            </span>
            <ChevronsUpDownIcon aria-hidden className="hidden size-4 text-muted-foreground xl:block" />
          </button>
        }
      />
    </aside>
  )
}

function NavSection({ title, items, divider = false }: { title: string; items: Array<NavItem>; divider?: boolean }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1">
      <p className="hidden px-3 pb-1 text-eyebrow text-muted-foreground xl:block">{t(title)}</p>
      {divider && <span aria-hidden className="mx-auto mb-1 h-px w-8 bg-border xl:hidden" />}
      <ul className="flex flex-col gap-1">
        {items.map(({ to, label, short, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={ACTIVE_OPTIONS}
              title={t(label)}
              className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[0.6875rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary xl:flex-row xl:gap-3 xl:px-3 xl:py-2 xl:text-sm"
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className="xl:hidden">{t(short)}</span>
              <span className="hidden truncate xl:inline">{t(label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
