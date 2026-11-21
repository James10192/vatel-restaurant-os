import { BookOpenTextIcon, ChefHatIcon, CalendarCheckIcon, ClipboardListIcon, HouseIcon, LayoutDashboardIcon, ListChecksIcon, UserIcon, WalletIcon } from 'lucide-react'
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
export type NavItem = { to: NavTo; label: string; short: string; icon: LucideIcon }

/** Espace repas (#11) : Accueil / Repas / Solde. `short` sert au rail tablette et à la barre du bas. */
export const MEAL_NAV: Array<NavItem> = [
  { to: '/app', label: 'Accueil', short: 'Accueil', icon: HouseIcon },
  { to: '/app/bookings', label: 'Mes repas', short: 'Repas', icon: CalendarCheckIcon },
  { to: '/app/wallet', label: 'Solde', short: 'Solde', icon: WalletIcon },
]

/** Profil et réglages : onglet de la barre du bas (mobile), lien du menu compte (tablette, bureau). */
export const PROFILE_NAV: NavItem = { to: '/app/profile', label: 'Mon profil', short: 'Profil', icon: UserIcon }

/** Gestion, administration seulement : le serveur revérifie le rôle à chaque fonction. */
export const ADMIN_NAV: Array<NavItem> = [
  { to: '/admin', label: 'Vue d’ensemble', short: 'Pilotage', icon: LayoutDashboardIcon },
  { to: '/admin/menus', label: 'Menus', short: 'Menus', icon: ClipboardListIcon },
  { to: '/admin/services', label: 'Commandes du jour', short: 'Service', icon: ListChecksIcon },
  { to: '/admin/production', label: 'Production', short: 'Production', icon: ChefHatIcon },
  { to: '/admin/recettes', label: 'Fiches techniques', short: 'Fiches', icon: BookOpenTextIcon },
]

/** Liens actifs sur le chemin seul : `?date=` ou `?week=` ne doivent pas éteindre l'onglet. */
export const ACTIVE_OPTIONS = { exact: true, includeSearch: false } as const

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
