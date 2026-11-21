import { Link } from '@tanstack/react-router'
import { MailIcon, UserIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '#/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '#/components/ui/input-group'
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/utils'
import { PasswordInput } from './password-input'
import { useEmailAuth } from './use-email-auth'

export type AuthMode = 'login' | 'signup'

const MODES = {
  login: {
    action: 'signIn',
    title: 'Bon retour parmi nous',
    description: 'Connectez-vous pour réserver vos repas.',
    submit: 'Se connecter',
    passwordAutoComplete: 'current-password',
  },
  signup: {
    action: 'signUp',
    title: 'Créer un compte',
    description: 'Votre établissement validera ensuite votre accès.',
    submit: 'Créer mon compte',
    passwordAutoComplete: 'new-password',
  },
} as const

const FIELD = 'h-12 rounded-xl bg-muted/60'

/** Champ plein avec icône en tête ; le libellé reste lisible par les lecteurs d'écran. */
function IconField({ id, label, icon: Icon, ...props }: { id: string; label: string; icon: LucideIcon } & ComponentProps<typeof InputGroupInput>) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </FieldLabel>
      <InputGroup className={FIELD}>
        <InputGroupAddon>
          <Icon />
        </InputGroupAddon>
        <InputGroupInput id={id} name={id} placeholder={label} {...props} />
      </InputGroup>
    </Field>
  )
}

/** Sélecteur Inscription / Connexion en pastilles : deux liens, l'URL reste la source de vérité. */
function ModeSwitch({ mode, redirectTo }: { mode: AuthMode; redirectTo: string }) {
  const tab = (target: AuthMode, label: string) => (
    <Link
      to="/auth"
      search={{ redirect: redirectTo, mode: target === 'signup' ? 'signup' : undefined }}
      aria-current={mode === target ? 'page' : undefined}
      className={cn(
        'flex-1 rounded-full px-5 py-2 text-center text-sm font-semibold transition-colors',
        mode === target ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  )
  return (
    <nav aria-label="Choisir l’action" className="mx-auto flex w-full max-w-xs rounded-full bg-muted p-1">
      {tab('signup', 'Inscription')}
      {tab('login', 'Connexion')}
    </nav>
  )
}

// Composition inspirée des blocs officiels @shadcn/login-03 et @shadcn/signup-03.
export function AuthForm({ mode, redirectTo }: { mode: AuthMode; redirectTo: string }) {
  const copy = MODES[mode]
  const { pending, error, onSubmit } = useEmailAuth(copy.action, redirectTo)
  return (
    <div className="flex w-full flex-col gap-8">
      <ModeSwitch mode={mode} redirectTo={redirectTo} />
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.description}</p>
      </div>
      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <IconField id="firstName" label="Prénom" icon={UserIcon} autoComplete="given-name" required />
              <IconField id="lastName" label="Nom" icon={UserIcon} autoComplete="family-name" required />
            </div>
          )}
          <IconField id="email" label="Adresse e-mail" icon={MailIcon} type="email" autoComplete="email" required />
          <Field>
            <FieldLabel htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Mot de passe
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mot de passe"
              className={FIELD}
              autoComplete={copy.passwordAutoComplete}
              required
              minLength={mode === 'signup' ? 8 : undefined}
            />
          </Field>
          {mode === 'signup' && (
            <Field>
              <FieldLabel htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
                Confirmer le mot de passe
              </FieldLabel>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirmer le mot de passe"
                className={FIELD}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <FieldDescription>Au moins 8 caractères.</FieldDescription>
            </Field>
          )}
          <FormError message={error} />
          <Button
            type="submit"
            size="lg"
            className="mt-2 h-12 rounded-xl text-base shadow-lg shadow-primary/30"
            disabled={pending}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {copy.submit}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}
