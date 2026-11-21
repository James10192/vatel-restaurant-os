import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DownloadIcon, LogOutIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { ThemeSubmenu } from '#/components/theme-submenu'
import { PROFILE_NAV } from '#/components/shell/nav-model'
import { useInstall } from '#/lib/install'
import { ROLE_LABELS, currentUserQuery, useSignOut } from '#/lib/session'
import { useT } from '#/i18n/i18n'

const ProfileIcon = PROFILE_NAV.icon

/**
 * Menu du compte (tablette, bureau) : identité, raccourcis, déconnexion. Les réglages complets sont sur
 * la page Profil. `side` suit la position du déclencheur.
 */
export function AccountMenu({
  trigger,
  side = 'top',
}: {
  trigger: ReactNode
  side?: 'top' | 'right'
}) {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const { state: install, promptInstall } = useInstall()
  const signOut = useSignOut()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.membership
              ? `${ROLE_LABELS[user.membership.role]}, ${user.membership.canteenName}`
              : t('Compte non rattaché')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to={PROFILE_NAV.to}>
              <ProfileIcon />
              {t(PROFILE_NAV.label)}
            </Link>
          </DropdownMenuItem>
          {/* Seulement quand le navigateur propose réellement l'installation (jamais de faux bouton). */}
          {install === 'available' && (
            <DropdownMenuItem onSelect={() => void promptInstall()}>
              <DownloadIcon />
              {t('Installer l’application')}
            </DropdownMenuItem>
          )}
          <ThemeSubmenu />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOutIcon />
            {t('Se déconnecter')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
