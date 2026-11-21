import { useSyncExternalStore } from 'react'

/**
 * Vrai quand la fenêtre fait au moins `px` de large. À réserver aux composants qui coûtent quelque chose
 * (abonnement Convex) et n'ont de sens qu'à partir d'une largeur : la mise en page, elle, reste en CSS.
 * Serveur et hydratation : toujours faux, donc HTML identique ; le composant apparaît juste après sur grand écran.
 */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}
