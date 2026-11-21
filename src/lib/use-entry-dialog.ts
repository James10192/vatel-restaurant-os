import { useState } from 'react'
import { useServerAction } from '#/lib/server-action'

/** Clé d'idempotence d'une saisie : une par ouverture de formulaire (un double envoi n'ajoute rien). */
export const newRequestKey = () => crypto.randomUUID()

/**
 * État commun d'une saisie en fenêtre : chaque ouverture repart d'un formulaire vide (`onOpen`), d'une nouvelle
 * clé d'idempotence et sans erreur affichée. L'action renvoie undefined en cas d'échec (jamais de succès supposé).
 */
export function useEntryDialog<TArgs extends Array<unknown>, TResult>(mutation: (...args: TArgs) => Promise<TResult>, onOpen: () => void) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(newRequestKey)
  const action = useServerAction(mutation)
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    setKey(newRequestKey())
    action.setError(null)
    onOpen()
  }
  return { open, setOpen, onOpenChange, key, action }
}
