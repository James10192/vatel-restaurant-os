import { useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from '#/lib/auth-client'
import { authErrorMessage } from './auth-errors'

type Credentials = { email: string; password: string; name: string }
type AuthResult = { error: { code?: string; status?: number } | null }

const ACTIONS: Record<'signIn' | 'signUp', (c: Credentials) => Promise<AuthResult>> = {
  signIn: ({ email, password }) => authClient.signIn.email({ email, password }),
  signUp: (c) => authClient.signUp.email(c),
}

/** Soumission e-mail/mot de passe : un seul flux pour connexion et inscription. */
export function useEmailAuth(action: keyof typeof ACTIONS, redirectTo: string) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '')
    setPending(true)
    setError(null)
    const result = await ACTIONS[action]({
      email: field('email').trim(),
      password: field('password'),
      name: field('name').trim(),
    }).catch((): AuthResult => ({ error: {} }))
    if (result.error) {
      setPending(false)
      setError(authErrorMessage(result.error))
      return
    }
    // Rechargement complet : le serveur doit relire le cookie de session pour le SSR.
    window.location.assign(redirectTo)
  }

  return { pending, error, onSubmit }
}
