import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import {
  LOW_BALANCE_XOF,
  NOTIFICATION_CATEGORIES,
} from '../../../convex/lib/notifications'
import type { NotificationCategory } from '../../../convex/lib/notifications'
import { FormError } from '#/components/form-error'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '#/components/ui/field'
import { Skeleton } from '#/components/ui/skeleton'
import { Switch } from '#/components/ui/switch'
import { formatXof } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

const LABELS: Record<
  NotificationCategory,
  { title: string; description: string }
> = {
  menuPublished: {
    title: 'Menus de la semaine',
    description: 'Quand l’administration publie les menus.',
  },
  bookingReminder: {
    title: 'Rappel avant la clôture',
    description:
      'Dans l’heure qui précède la fin des réservations, si vous n’avez pas encore réservé.',
  },
  lowBalance: {
    title: 'Solde bas',
    description: 'Quand votre solde passe sous {amount}.',
  },
}

/**
 * Familles de notifications reçues, pour tous les appareils du compte. L'interrupteur affiche l'état lu
 * sur le serveur (temps réel Convex) : aucun changement n'est montré avant confirmation.
 */
export function NotificationPreferences() {
  const t = useT()
  const { data: enabled } = useQuery(
    convexQuery(api.notificationPreferences.mine, {}),
  )
  const save = useServerAction(useMutation(api.notificationPreferences.set))

  return (
    <FieldSet>
      <FieldLegend variant="label">{t('Recevoir')}</FieldLegend>
      <FieldDescription>
        {t('Ces choix valent pour tous vos appareils.')}
      </FieldDescription>
      <FieldGroup className="gap-4">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Field key={category} orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`notif-${category}`}>
                {t(LABELS[category].title)}
              </FieldLabel>
              <FieldDescription>
                {t(LABELS[category].description, { amount: formatXof(LOW_BALANCE_XOF) })}
              </FieldDescription>
            </FieldContent>
            {enabled ? (
              <Switch
                id={`notif-${category}`}
                checked={enabled[category]}
                disabled={save.pending}
                onCheckedChange={(checked) =>
                  void save.run({ category, enabled: checked })
                }
              />
            ) : (
              <Skeleton className="h-5 w-9 rounded-full" />
            )}
          </Field>
        ))}
      </FieldGroup>
      <FormError message={save.error} />
    </FieldSet>
  )
}
