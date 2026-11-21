import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FlaskConicalIcon,
  LanguagesIcon, LogOutIcon, PaletteIcon } from 'lucide-react'
import { LanguageToggle } from '#/components/language-toggle'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { IdentityCard } from '#/features/profile/identity-card'
import { InstallSection } from '#/features/profile/install-section'
import { NotificationsSection } from '#/features/profile/notifications-section'
import { PasswordSection } from '#/features/profile/password-section'
import { SettingsSection } from '#/features/profile/settings-section'
import { currentUserQuery, useSignOut } from '#/lib/session'
import { THEME_LABELS, useTheme } from '#/lib/theme'
import { useT } from '#/i18n/i18n'

export const Route = createFileRoute('/_authed/app/profile')({
  head: () => ({ meta: [{ title: 'Profil | Vatel Restauration' }] }),
  component: ProfilePage,
})

/** Profil et réglages, ouvert à tout compte connecté (rattaché ou non). Les notifications exigent un rattachement. */
function ProfilePage() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const { preference } = useTheme()
  const signOut = useSignOut()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('Mon profil')}</h1>
      <IdentityCard />

      {user?.membership && <NotificationsSection />}
      <InstallSection />

      <SettingsSection
        icon={PaletteIcon}
        title={t('Apparence')}
        description={t('Thème actuel : {theme}. Réglage propre à cet appareil.', { theme: t(THEME_LABELS[preference]) })}
      >
        <ThemeToggle className="self-start" />
      </SettingsSection>

      <SettingsSection icon={LanguagesIcon} title={t('Langue')} description={t('Langue de l’interface, propre à cet appareil.')}>
        <LanguageToggle className="self-start" />
      </SettingsSection>

      <PasswordSection />

      <SettingsSection
        icon={FlaskConicalIcon}
        title={t('À propos')}
        description={t('Prototype étudiant, hackathon Vatel × Epitech.')}
      >
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            {t('Données fictives et crédits de démonstration : aucun paiement réel.')}
          </li>
          <li>
            {t('Chaque réservation, annulation ou recharge n’est valable qu’une fois confirmée par le serveur.')}
          </li>
          <li>
            {t('Une connexion internet est nécessaire : l’application ne fonctionne pas hors ligne.')}
          </li>
        </ul>
      </SettingsSection>

      <Button variant="destructive" size="lg" onClick={() => void signOut()}>
        <LogOutIcon data-icon="inline-start" />
        {t('Se déconnecter')}
      </Button>
    </main>
  )
}
