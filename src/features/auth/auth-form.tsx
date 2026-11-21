import { Link } from '@tanstack/react-router'
import { CircleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { PasswordInput } from './password-input'
import { useEmailAuth } from './use-email-auth'

export type AuthMode = 'login' | 'signup'

const MODES = {
  login: {
    action: 'signIn',
    title: 'Bon retour',
    description: 'Connectez-vous pour réserver vos repas',
    submit: 'Se connecter',
    passwordAutoComplete: 'current-password',
    switchText: 'Pas encore de compte ?',
    switchLink: 'Créer un compte',
    switchTo: 'signup',
  },
  signup: {
    action: 'signUp',
    title: 'Créer votre compte',
    description: 'Quelques informations suffisent',
    submit: 'Créer mon compte',
    passwordAutoComplete: 'new-password',
    switchText: 'Déjà inscrit ?',
    switchLink: 'Se connecter',
    switchTo: undefined,
  },
} as const

// Composition adaptée des blocs officiels @shadcn/login-03 et @shadcn/signup-03.
export function AuthForm({ mode, redirectTo }: { mode: AuthMode; redirectTo: string }) {
  const copy = MODES[mode]
  const { pending, error, onSubmit } = useEmailAuth(copy.action, redirectTo)
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {mode === 'signup' && (
              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required minLength={2} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                autoComplete={copy.passwordAutoComplete}
                required
                minLength={mode === 'signup' ? 8 : undefined}
              />
              {mode === 'signup' && <FieldDescription>Au moins 8 caractères.</FieldDescription>}
            </Field>
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {copy.submit}
              </Button>
              <FieldDescription className="text-center">
                {copy.switchText}{' '}
                <Link to="/auth" search={{ redirect: redirectTo, mode: copy.switchTo }}>
                  {copy.switchLink}
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
