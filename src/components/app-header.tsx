import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { LogOutIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { ROLE_LABELS, currentUserQuery, signOut } from '#/lib/session'

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** En-tête commun : logo, navigation selon le rôle, menu du compte. */
export function AppHeader() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const isAdmin = user?.membership?.role === 'admin'
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4">
        <Link to="/app" aria-label="Accueil">
          <BrandLogo className="h-10" />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app" activeProps={{ className: 'bg-accent' }}>
              Repas
            </Link>
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/menus" activeProps={{ className: 'bg-accent' }}>
                Menus
              </Link>
            </Button>
          )}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto rounded-full" aria-label="Mon compte">
              <Avatar>
                <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">{user?.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user?.membership ? ROLE_LABELS[user.membership.role] : 'Compte non rattaché'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={signOut}>
                <LogOutIcon />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
