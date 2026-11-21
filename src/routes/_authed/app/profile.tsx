import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FlaskConicalIcon, LogOutIcon, PaletteIcon } from 'lucide-react'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { IdentityCard } from '#/features/profile/identity-card'
import { InstallSection } from '#/features/profile/install-section'
import { NotificationsSection } from '#/features/profile/notifications-section'
import { PasswordSection } from '#/features/profile/password-section'
import { SettingsSection } from '#/features/profile/settings-section'
import { currentUserQuery, useSignOut } from '#/lib/session'
import { THEME_LABELS, useTheme } from '#/lib/theme'

export const Route = createFileRoute('/_authed/app/profile')({
  head: () => ({ meta: [{ title: 'Profil | Vatel Restauration' }] }),
  component: ProfilePage,
})

/** Profil et réglages, ouvert à tout compte connecté (rattaché ou non). Les notifications exigent un rattachement. */
function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const { preference } = useTheme()
  const signOut = useSignOut()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
      <IdentityCard />

      {user?.membership && <NotificationsSection />}
      <InstallSection />

      <SettingsSection
        icon={PaletteIcon}
        title="Apparence"
        description={`Thème actuel : ${THEME_LABELS[preference]}. Réglage propre à cet appareil.`}
      >
        <ThemeToggle className="self-start" />
      </SettingsSection>

      <PasswordSection />

      <SettingsSection
        icon={FlaskConicalIcon}
        title="À propos"
        description="Prototype étudiant, hackathon Vatel × Epitech."
      >
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            Données fictives et crédits de démonstration : aucun paiement réel.
          </li>
          <li>
            Chaque réservation, annulation ou recharge n’est valable qu’une fois
            confirmée par le serveur.
          </li>
          <li>
            Une connexion internet est nécessaire : l’application ne fonctionne
            pas hors ligne.
          </li>
        </ul>
      </SettingsSection>

      <Button variant="destructive" size="lg" onClick={() => void signOut()}>
        <LogOutIcon data-icon="inline-start" />
        Se déconnecter
      </Button>
    </main>
  )
}
