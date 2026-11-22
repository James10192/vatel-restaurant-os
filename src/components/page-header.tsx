import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BrandLogo } from '#/components/brand-logo'
import { InstallIconButton } from '#/components/install-icon-button'
import { ACTIVE_OPTIONS, TAB_BAR_PAGES, homeOf, staffNav } from '#/components/shell/nav-model'
import { currentUserQuery } from '#/lib/session'
import { useT } from '#/i18n/i18n'

/**
 * En-tête unique des pages. Mobile : titre et logo Vatel sur la même ligne (la barre latérale porte le logo dès
 * la tablette), puis la description, les pages du rôle qui ne tiennent pas dans la barre du bas, et les actions.
 * Bureau : titre et description à gauche, actions à droite.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-display">{title}</h1>
          <BrandMark />
        </div>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        <MorePages />
      </div>
      {actions}
    </header>
  )
}

/** Logo (retour à l'accueil du rôle) et installation de l'application, sur mobile seulement. */
function BrandMark() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return (
    <div className="flex shrink-0 items-center gap-2 md:hidden">
      <InstallIconButton />
      <Link to={homeOf(user?.membership?.role)} aria-label={t('Accueil')}>
        <BrandLogo className="h-11" />
      </Link>
    </div>
  )
}

/** Pages du rôle au-delà de la barre du bas (mobile) : le rail et la barre latérale les montrent dès la tablette. */
function MorePages() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const pages = staffNav(user?.membership?.role).slice(TAB_BAR_PAGES)
  if (pages.length === 0) return null
  return (
    <nav aria-label={t('Autres pages')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-2 [scrollbar-width:none] md:hidden">
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
