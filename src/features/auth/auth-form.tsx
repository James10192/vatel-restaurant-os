import { useState  } from 'react'
import type {FormEvent} from 'react';
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { authClient } from '#/lib/auth-client'
import { authErrorMessage } from './auth-errors'

type Mode = 'signIn' | 'signUp'

const COPY: Record<Mode, { title: string; submit: string; switchLabel: string }> = {
  signIn: { title: 'Connexion', submit: 'Se connecter', switchLabel: 'Pas encore de compte ? Créer un compte' },
  signUp: { title: 'Créer un compte', submit: 'Créer mon compte', switchLabel: 'Déjà inscrit ? Se connecter' },
}

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<Mode>('signIn')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = COPY[mode]

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const name = String(data.get('name') ?? '').trim()
    setPending(true)
    setError(null)
    let result
    try {
      result =
        mode === 'signUp'
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password })
    } catch {
      setPending(false)
      setError(authErrorMessage({}))
      return
    }
    setPending(false)
    if (result.error) {
      setError(authErrorMessage(result.error))
      return
    }
    // Rechargement complet volontaire : le token SSR doit être relu par le serveur.
    window.location.assign(redirectTo)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>Vatel — Restauration</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate={false}>
          <FieldGroup>
            {mode === 'signUp' && (
              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required minLength={2} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                required
                minLength={8}
              />
            </Field>
            {error && <FieldError role="alert">{error}</FieldError>}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? 'Patientez…' : copy.submit}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn')
                setError(null)
              }}
            >
              {copy.switchLabel}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
