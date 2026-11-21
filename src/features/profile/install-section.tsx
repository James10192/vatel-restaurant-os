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
import { useT } from '#/i18n/i18n'

/**
 * Installation sur l'écran d'accueil. Le bouton n'existe que si le navigateur propose réellement
 * l'installation ; sinon, la marche à suivre propre à l'appareil. Aucun mode hors ligne n'est promis.
 */
export function InstallSection() {
  const t = useT()
  const { state, promptInstall } = useInstall()
  return (
    <SettingsSection
      icon={SmartphoneIcon}
      title={t('Application')}
      description={t('Ajoutez Vatel Restauration à l’écran d’accueil pour l’ouvrir comme une application. Une connexion internet reste nécessaire.')}
    >
      {state === 'installed' && (
        <StatusLine icon={CheckCircle2Icon} tone="success">
          {t('Application installée sur cet appareil.')}
        </StatusLine>
      )}

      {state === 'available' && (
        <Button
          size="lg"
          className="self-start"
          onClick={() => void promptInstall()}
        >
          <DownloadIcon data-icon="inline-start" />
          {t('Installer l’application')}
        </Button>
      )}

      {state === 'ios' && (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            {t('Dans Safari, touchez')}{' '}
            <ShareIcon
              aria-label={t('Partager')}
              className="inline size-4 align-text-bottom"
            />{' '}
            {t('Partager.')}
          </li>
          <li>{t('Choisissez « Sur l’écran d’accueil ».')}</li>
          <li>{t('Touchez « Ajouter ».')}</li>
        </ol>
      )}

      {state === 'unavailable' && (
        <StatusLine icon={InfoIcon}>
          {t('Votre navigateur ne propose pas l’installation pour le moment. Sur Android, ouvrez le menu de Chrome puis « Installer l’application ». Sur ordinateur, utilisez l’icône d’installation de Chrome ou Edge dans la barre d’adresse.')}
        </StatusLine>
      )}
    </SettingsSection>
  )
}
