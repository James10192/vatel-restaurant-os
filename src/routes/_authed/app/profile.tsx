import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FlaskConicalIcon,
  LanguagesIcon, LogOutIcon, PaletteIcon } from 'lucide-react'
import { LanguageToggle } from '#/components/language-toggle'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { AllergiesSection } from '#/features/profile/allergies-section'
import { IdentityCard } from '#/features/profile/identity-card'
import { InstallSection } from '#/features/profile/install-section'
import { NotificationsSection } from '#/features/profile/notifications-section'
import { PasswordSection } from '#/features/profile/password-section'
import { SettingsSection } from '#/features/profile/settings-section'
import { currentUserQuery, useSignOut } from '#/lib/session'
import { THEME_LABELS, useTheme } from '#/lib/theme'
import { useT, pageTitle } from '#/i18n/i18n'
import { PageHeader } from '#/components/page-header'

export const Route = createFileRoute('/_authed/app/profile')({
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Profil') }] }),
  component: ProfilePage,
})

/** Profil et réglages, ouvert à tout compte connecté (rattaché ou non). Les notifications exigent un rattachement. */
function ProfilePage() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const { preference } = useTheme()
  const signOut = useSignOut()
  return (
    // Mobile : une colonne. Dès le bureau : la personne et son compte à gauche, l'appareil et l'application à droite.
    <main className="workspace flex max-w-6xl flex-col gap-6 py-6 md:py-8 xl:py-10">
      <PageHeader title={t('Mon profil')} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <IdentityCard />
          {user?.membership && <AllergiesSection />}
          {user?.membership && <NotificationsSection />}
          <PasswordSection />
        </div>
        <div className="flex flex-col gap-6">
          <SettingsSection icon={PaletteIcon} title={t('Affichage')} description={t('Thème et langue, propres à cet appareil.')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">{t('Thème : {theme}', { theme: t(THEME_LABELS[preference]) })}</span>
              <ThemeToggle />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <LanguagesIcon aria-hidden className="size-4 text-muted-foreground" />
                {t('Langue')}
              </span>
              <LanguageToggle />
            </div>
          </SettingsSection>
          <InstallSection />
          <SettingsSection icon={FlaskConicalIcon} title={t('À propos')} description={t('Prototype étudiant, hackathon Vatel × Epitech.')}>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              <li>{t('Données fictives et crédits de démonstration : aucun paiement réel.')}</li>
              <li>{t('Chaque réservation, annulation ou recharge n’est valable qu’une fois confirmée par le serveur.')}</li>
              <li>{t('Une connexion internet est nécessaire : l’application ne fonctionne pas hors ligne.')}</li>
            </ul>
          </SettingsSection>
          <Button variant="destructive" size="lg" onClick={() => void signOut()}>
            <LogOutIcon data-icon="inline-start" />
            {t('Se déconnecter')}
          </Button>
        </div>
      </div>
    </main>
  )
}
