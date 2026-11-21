import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2Icon, KeyRoundIcon } from 'lucide-react'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Spinner } from '#/components/ui/spinner'
import { PasswordInput } from '#/features/auth/password-input'
import { authErrorMessage } from '#/features/auth/auth-errors'
import { authClient } from '#/lib/auth-client'
import { SettingsSection, StatusLine } from './settings-section'
import { useT } from '#/i18n/i18n'

const MIN_LENGTH = 8

/** Changement de mot de passe (Better Auth) : l'ancien est exigé, les autres sessions sont fermées. */
export function PasswordSection() {
  const t = useT()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('currentPassword'))
    const newPassword = String(data.get('newPassword'))
    setDone(false)
    if (newPassword !== String(data.get('confirmPassword')))
      return setError(t('Les deux nouveaux mots de passe sont différents.'))
    if (newPassword === currentPassword)
      return setError(
        t('Le nouveau mot de passe doit être différent de l’actuel.'),
      )
    setPending(true)
    setError(null)
    const result = await authClient
      .changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      .catch(() => null)
    setPending(false)
    if (!result || result.error)
      return setError(authErrorMessage(result?.error ?? {}))
    form.reset()
    setDone(true)
  }

  return (
    <SettingsSection
      icon={KeyRoundIcon}
      title={t('Mot de passe')}
      description={t('Modifiez le mot de passe de connexion de ce compte.')}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="currentPassword">
              {t('Mot de passe actuel')}
            </FieldLabel>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="newPassword">{t('Nouveau mot de passe')}</FieldLabel>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              required
            />
            <FieldDescription>
              {t('Au moins')} {MIN_LENGTH} {t('caractères.')}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">
              {t('Confirmer le nouveau mot de passe')}
            </FieldLabel>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              required
            />
          </Field>
        </FieldGroup>
        <FormError message={error} />
        {done && (
          <StatusLine icon={CheckCircle2Icon} tone="success">
            {t('Mot de passe modifié. Vos autres appareils seront déconnectés.')}
          </StatusLine>
        )}
        <Button
          type="submit"
          size="lg"
          className="self-start"
          disabled={pending}
        >
          {pending && <Spinner data-icon="inline-start" />}
          {t('Enregistrer')}
        </Button>
      </form>
    </SettingsSection>
  )
}
