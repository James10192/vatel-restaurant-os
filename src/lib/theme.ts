import { useEffect, useState } from 'react'

/** Préférence d'affichage, propre à l'appareil (confort, jamais une donnée métier). */
export const THEMES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEMES)[number]

export const THEME_LABELS: Record<ThemePreference, string> = { light: 'Clair', dark: 'Sombre', system: 'Système' }

const STORAGE_KEY = 'vatel-theme'
const isTheme = (value: unknown): value is ThemePreference => THEMES.some((theme) => theme === value)

/** Exécuté dans <head> avant React : même règle que `applyTheme`, sans dépendance. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((t!=='light')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`

function readPreference(): ThemePreference {
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

/** Thème Clair / Sombre / Système ; « Système » suit le réglage de l'appareil en direct. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system')

  useEffect(() => setPreference(readPreference()), [])

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  function choose(value: string) {
    if (!isTheme(value)) return
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session en cours.
    }
    setPreference(value)
  }

  return { preference, choose }
}
