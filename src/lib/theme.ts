import { useSyncExternalStore } from 'react'

/** Préférence d'affichage, propre à l'appareil (confort, jamais une donnée métier). */
export const THEMES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEMES)[number]

export const THEME_LABELS: Record<ThemePreference, string> = { light: 'Clair', dark: 'Sombre', system: 'Système' }

const STORAGE_KEY = 'vatel-theme'
const isTheme = (value: unknown): value is ThemePreference => THEMES.some((theme) => theme === value)

/** Exécuté dans <head> avant React : même règle que `applyTheme`, sans dépendance. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((t!=='light')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * Store unique au niveau du module : tous les sélecteurs (menu Profil, accueil /auth) partagent la même préférence.
 * Lue une seule fois depuis le stockage ; la classe `dark` n'est appliquée qu'ici (le script de démarrage s'occupe
 * du premier rendu, donc aucun effet ne réapplique « Système » avant lecture : pas de flash).
 */
let current: ThemePreference | null = null
const listeners = new Set<() => void>()

function getSnapshot(): ThemePreference {
  current ??= readStored()
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // « Système » suit le réglage de l'appareil en direct ; un seul écouteur pour toute l'application.
  const media = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => getSnapshot() === 'system' && applyTheme('system')
  media.addEventListener('change', onChange)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onChange)
  }
}

function setPreference(value: string) {
  if (!isTheme(value)) return
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session en cours.
  }
  current = value
  applyTheme(value)
  listeners.forEach((listener) => listener())
}

/** Thème Clair / Sombre / Système. Côté serveur : « Système » (le script de démarrage a déjà posé la bonne classe). */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as const)
  return { preference, choose: setPreference }
}
