import { BookOpenTextIcon, ChefHatIcon, PackageIcon, CalendarCheckIcon, ClipboardListIcon, HouseIcon, LayoutDashboardIcon, ListChecksIcon, UserIcon, WalletIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavTo =
  | '/app'
  | '/app/bookings'
  | '/app/wallet'
  | '/app/profile'
  | '/admin'
  | '/admin/menus'
  | '/admin/services'
  | '/admin/recettes'
  | '/admin/production'
  | '/admin/stocks'
export type NavItem = { to: NavTo; label: string; short: string; icon: LucideIcon }
export type StaffRole = 'admin' | 'chef' | 'distribution'
type StaffItem = NavItem & { roles: ReadonlyArray<StaffRole> }

/** Espace repas (#11) : Accueil / Repas / Solde. `short` sert au rail tablette et à la barre du bas. */
export const MEAL_NAV: Array<NavItem> = [
  { to: '/app', label: 'Accueil', short: 'Accueil', icon: HouseIcon },
  { to: '/app/bookings', label: 'Mes repas', short: 'Repas', icon: CalendarCheckIcon },
  { to: '/app/wallet', label: 'Solde', short: 'Solde', icon: WalletIcon },
]

/** Profil et réglages : onglet de la barre du bas (mobile), lien du menu compte (tablette, bureau). */
export const PROFILE_NAV: NavItem = { to: '/app/profile', label: 'Mon profil', short: 'Profil', icon: UserIcon }

/**
 * Gestion : chaque page dit quels rôles du personnel la voient (cuisine : production et stocks ; distribution :
 * commandes du jour). Confort seulement : chaque fonction serveur revérifie le rôle.
 */
export const ADMIN_NAV: Array<StaffItem> = [
  { to: '/admin', label: 'Vue d’ensemble', short: 'Pilotage', icon: LayoutDashboardIcon, roles: ['admin'] },
  { to: '/admin/menus', label: 'Menus', short: 'Menus', icon: ClipboardListIcon, roles: ['admin'] },
  { to: '/admin/services', label: 'Commandes du jour', short: 'Service', icon: ListChecksIcon, roles: ['admin', 'distribution'] },
  { to: '/admin/production', label: 'Production', short: 'Production', icon: ChefHatIcon, roles: ['admin', 'chef'] },
  { to: '/admin/stocks', label: 'Stocks', short: 'Stocks', icon: PackageIcon, roles: ['admin', 'chef'] },
  { to: '/admin/recettes', label: 'Fiches techniques', short: 'Fiches', icon: BookOpenTextIcon, roles: ['admin'] },
]

/** Pages de gestion visibles pour un rôle (vide pour un usager ou un compte non rattaché). */
export const staffNav = (role: string | undefined): Array<NavItem> => ADMIN_NAV.filter((item) => item.roles.some((r) => r === role))

/** Liens actifs sur le chemin seul : `?date=` ou `?week=` ne doivent pas éteindre l'onglet. */
export const ACTIVE_OPTIONS = { exact: true, includeSearch: false } as const

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
