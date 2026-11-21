import { useState } from 'react'
import { ConvexError } from 'convex/values'

/** Message lisible : message métier du serveur, sinon message réseau générique. */
export const errorMessage = (error: unknown) =>
  error instanceof ConvexError && typeof error.data === 'string' ? error.data : 'Échec. Vérifiez la connexion et réessayez.'

/**
 * Exécute une action serveur avec état « en cours » et message d'erreur.
 * Renvoie le résultat, ou undefined en cas d'échec (jamais de succès supposé).
 */
export function useServerAction<TArgs extends Array<unknown>, TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(...args: TArgs): Promise<TResult | undefined> {
    setPending(true)
    setError(null)
    try {
      return await action(...args)
    } catch (e) {
      setError(errorMessage(e))
      return undefined
    } finally {
      setPending(false)
    }
  }

  return { run, pending, error, setError }
}
