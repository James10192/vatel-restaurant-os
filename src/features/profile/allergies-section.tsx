import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CircleCheckIcon, ShieldAlertIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { AllergenPicker } from '#/components/allergen-picker'
import type { AllergyValue } from '#/components/allergen-picker'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'
import { SettingsSection } from './settings-section'

const same = (a: AllergyValue, b: AllergyValue) =>
  JSON.stringify([[...a.codes].sort(), [...a.others].sort()]) === JSON.stringify([[...b.codes].sort(), [...b.others].sort()])

/**
 * Allergies déclarées par la personne elle-même. Le menu l'alerte ensuite sur chaque plat qui les contient, ou dont les
 * allergènes ne sont pas renseignés. « Enregistré » s'affiche seulement après confirmation du serveur.
 */
export function AllergiesSection() {
  const t = useT()
  const { data: saved } = useQuery(convexQuery(api.account.myAllergies, {}))
  const [draft, setDraft] = useState<AllergyValue | null>(null)
  const { run, pending, error } = useServerAction(useMutation(api.account.setMyAllergies))
  const value = draft ?? saved
  const dirty = !!saved && !!draft && !same(draft, saved)

  async function save() {
    if (!draft) return
    const result = await run(draft)
    if (result) setDraft(null)
  }

  return (
    <SettingsSection
      icon={ShieldAlertIcon}
      title={t('Mes allergies')}
      description={t('Signalez vos allergies et intolérances : chaque plat qui en contient sera signalé dans le menu, avant de réserver.')}
    >
      {!value ? (
        <Skeleton className="h-10 w-48 rounded-full" />
      ) : (
        <div className="flex flex-col gap-4">
          {value.codes.length + value.others.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('Aucune allergie signalée.')}</p>
          )}
          <AllergenPicker value={value} onChange={setDraft} addLabel={t('Ajouter une allergie')} disabled={pending} />
          <FormError message={error} />
          {dirty ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {t('Enregistrer mes allergies')}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
                {t('Annuler')}
              </Button>
            </div>
          ) : (
            saved &&
            saved.codes.length + saved.others.length > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CircleCheckIcon className="size-4" />
                {t('Enregistré : le menu vous alerte sur ces allergies.')}
              </p>
            )
          )}
          <p className="text-xs text-muted-foreground">
            {t('Une alerte aide à choisir, elle ne remplace pas un avis médical. En cas de doute, demandez en cuisine.')}
          </p>
        </div>
      )}
    </SettingsSection>
  )
}
