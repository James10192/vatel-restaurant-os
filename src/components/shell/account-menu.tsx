import type { ReactNode } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { LogOutIcon } from 'lucide-react'
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
import { ROLE_LABELS, currentUserQuery, signOut } from '#/lib/session'

/** Menu du compte (« Profil ») : identité, rôle, apparence, déconnexion. `side` suit la position du déclencheur. */
export function AccountMenu({ trigger, side = 'top' }: { trigger: ReactNode; side?: 'top' | 'right' }) {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.membership ? `${ROLE_LABELS[user.membership.role]}, ${user.membership.canteenName}` : 'Compte non rattaché'}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeSubmenu />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={signOut}>
            <LogOutIcon />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
