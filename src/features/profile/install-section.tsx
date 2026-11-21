import {
  CheckCircle2Icon,
  DownloadIcon,
  InfoIcon,
  ShareIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useInstall } from '#/lib/install'
import { SettingsSection, StatusLine } from './settings-section'

/**
 * Installation sur l'écran d'accueil. Le bouton n'existe que si le navigateur propose réellement
 * l'installation ; sinon, la marche à suivre propre à l'appareil. Aucun mode hors ligne n'est promis.
 */
export function InstallSection() {
  const { state, promptInstall } = useInstall()
  return (
    <SettingsSection
      icon={SmartphoneIcon}
      title="Application"
      description="Ajoutez Vatel Restauration à l’écran d’accueil pour l’ouvrir comme une application. Une connexion internet reste nécessaire."
    >
      {state === 'installed' && (
        <StatusLine icon={CheckCircle2Icon} tone="success">
          Application installée sur cet appareil.
        </StatusLine>
      )}

      {state === 'available' && (
        <Button
          size="lg"
          className="self-start"
          onClick={() => void promptInstall()}
        >
          <DownloadIcon data-icon="inline-start" />
          Installer l’application
        </Button>
      )}

      {state === 'ios' && (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            Dans Safari, touchez{' '}
            <ShareIcon
              aria-label="Partager"
              className="inline size-4 align-text-bottom"
            />{' '}
            Partager.
          </li>
          <li>Choisissez « Sur l’écran d’accueil ».</li>
          <li>Touchez « Ajouter ».</li>
        </ol>
      )}

      {state === 'unavailable' && (
        <StatusLine icon={InfoIcon}>
          Votre navigateur ne propose pas l’installation pour le moment. Sur
          Android, ouvrez le menu de Chrome puis « Installer l’application ».
          Sur ordinateur, utilisez l’icône d’installation de Chrome ou Edge dans
          la barre d’adresse.
        </StatusLine>
      )}
    </SettingsSection>
  )
}
