import { Link } from '@tanstack/react-router'
import { CircleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
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
    eyebrow: 'Espace restauration',
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
    eyebrow: 'Nouveau compte',
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
    <Card className="gap-8 rounded-3xl border-0 py-10 shadow-2xl ring-1 shadow-primary/10 ring-border/70">
      <CardHeader className="gap-3 px-8">
        <Badge variant="secondary" className="w-fit">
          {copy.eyebrow}
        </Badge>
        <CardTitle className="text-3xl font-bold tracking-tight">{copy.title}</CardTitle>
        <CardDescription className="text-base">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {mode === 'signup' && (
              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input id="name" name="name" autoComplete="name" className="h-12" required minLength={2} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" className="h-12" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                className="h-12"
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
              <Button type="submit" size="lg" className="h-12 rounded-full text-base" disabled={pending}>
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
