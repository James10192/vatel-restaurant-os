import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  BellIcon,
  BellOffIcon,
  CheckCircle2Icon,
  InfoIcon,
  SendIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { usePushNotifications } from '#/lib/push'
import type { PushStatus } from '#/lib/push'
import { useServerAction } from '#/lib/server-action'
import { SettingsSection, StatusLine } from './settings-section'

/** Explication de chaque état où l'activation n'est pas possible ici (aucun bouton factice). */
const BLOCKED: Partial<Record<PushStatus, string>> = {
  unsupported:
    'Ce navigateur ne prend pas en charge les notifications. Essayez Chrome, Edge, Firefox ou Safari récent.',
  'needs-install':
    'Sur iPhone et iPad, installez d’abord l’application (section Application), puis ouvrez-la depuis l’écran d’accueil.',
  'not-configured':
    'Les notifications ne sont pas encore ouvertes par votre établissement.',
  denied:
    'Notifications bloquées pour ce site. Autorisez-les dans les réglages du navigateur, puis revenez ici.',
}

/** Notifications push de CET appareil : activer, tester, désactiver. Textes génériques, rien de personnel. */
export function NotificationsSection() {
  const { status, enable, disable } = usePushNotifications()
  const toggle = useServerAction(async (on: boolean) =>
    on ? enable() : disable(),
  )
  const test = useServerAction(useMutation(api.push.sendTest))
  const [sentTo, setSentTo] = useState<number | null>(null)
  const blocked = BLOCKED[status]

  return (
    <SettingsSection
      icon={BellIcon}
      title="Notifications"
      description="Soyez prévenu quand les menus de la semaine sont publiés. Aucun détail personnel ne s’affiche sur l’écran verrouillé."
    >
      {status === 'loading' && <Spinner />}
      {blocked && <StatusLine icon={InfoIcon}>{blocked}</StatusLine>}

      {status === 'off' && (
        <Button
          size="lg"
          className="self-start"
          disabled={toggle.pending}
          onClick={() => void toggle.run(true)}
        >
          {toggle.pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <BellIcon data-icon="inline-start" />
          )}
          Activer sur cet appareil
        </Button>
      )}

      {status === 'on' && (
        <>
          <StatusLine icon={CheckCircle2Icon} tone="success">
            Activées sur cet appareil.
          </StatusLine>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={test.pending}
              onClick={async () => {
                setSentTo(null)
                const devices = await test.run({})
                if (devices !== undefined) setSentTo(devices)
              }}
            >
              {test.pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              Envoyer un test
            </Button>
            <Button
              variant="outline"
              disabled={toggle.pending}
              onClick={() => void toggle.run(false)}
            >
              <BellOffIcon data-icon="inline-start" />
              Désactiver
            </Button>
          </div>
          {sentTo !== null && (
            <StatusLine icon={SendIcon}>
              Envoi accepté par le serveur pour {sentTo} appareil
              {sentTo > 1 ? 's' : ''}. La notification arrive en général en
              quelques secondes.
            </StatusLine>
          )}
        </>
      )}

      <FormError message={toggle.error ?? test.error} />
    </SettingsSection>
  )
}
