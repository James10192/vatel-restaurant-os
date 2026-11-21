import { DownloadIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useT } from '#/i18n/i18n'
import { useInstall } from '#/lib/install'

/**
 * Raccourci « Installer l'application » de l'en-tête mobile. N'existe que si le navigateur propose
 * réellement l'installation (Chrome, Edge, Android) : jamais de faux bouton, rien sur iPhone (la marche
 * à suivre Partager reste dans le Profil) ni une fois l'application installée.
 */
export function InstallIconButton() {
  const t = useT()
  const { state, promptInstall } = useInstall()
  if (state !== 'available') return null
  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="shrink-0 rounded-full"
      aria-label={t('Installer l’application')}
      title={t('Installer l’application')}
      onClick={() => void promptInstall()}
    >
      <DownloadIcon />
    </Button>
  )
}
