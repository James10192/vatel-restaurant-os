import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CalendarCheckIcon, ClipboardListIcon, HouseIcon, LogOutIcon, UserIcon, WalletIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { cn } from '#/lib/utils'

type NavItem = { to: '/app' | '/app/bookings' | '/app/wallet' | '/admin/menus'; label: string; icon: LucideIcon }

/** Navigation usager de #11 : Accueil / Repas / Solde / Profil (+ Menus pour l'administration). */
const USER_NAV: Array<NavItem> = [
  { to: '/app', label: 'Accueil', icon: HouseIcon },
  { to: '/app/bookings', label: 'Repas', icon: CalendarCheckIcon },
  { to: '/app/wallet', label: 'Solde', icon: WalletIcon },
]
const ADMIN_NAV: NavItem = { to: '/admin/menus', label: 'Menus', icon: ClipboardListIcon }

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function useNavItems(): Array<NavItem> {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return user?.membership?.role === 'admin' ? [...USER_NAV, ADMIN_NAV] : USER_NAV
}

/** Menu du compte (« Profil ») : identité, rôle, déconnexion. */
function AccountMenu({ trigger }: { trigger: React.ReactNode }) {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.membership ? `${ROLE_LABELS[user.membership.role]}, ${user.membership.canteenName}` : 'Compte non rattaché'}
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
  )
}

/** En-tête : logo partout ; liens et avatar seulement sur ordinateur (le mobile a la barre du bas). */
export function AppHeader() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const items = useNavItems()
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 md:h-16">
        <Link to="/app" aria-label="Accueil">
          <BrandLogo className="h-9 md:h-10" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {items.map(({ to, label }) => (
            <Button key={to} variant="ghost" size="sm" asChild>
              <Link to={to} activeOptions={{ exact: true }} activeProps={{ className: 'bg-accent' }}>
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <AccountMenu
            trigger={
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mon compte">
                <Avatar>
                  <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
                </Avatar>
              </Button>
            }
          />
        </div>
      </div>
    </header>
  )
}

const tabClass = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground'

/** Barre de navigation du bas, mobile uniquement : cibles tactiles larges, accessible au pouce. */
export function MobileTabBar() {
  const items = useNavItems()
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: true }}
          className={tabClass}
          activeProps={{ className: cn(tabClass, 'text-primary') }}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
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
