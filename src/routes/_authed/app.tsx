import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ClockIcon, LogOutIcon, UtensilsIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { BrandLogo } from '#/components/brand-logo'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { authClient } from '#/lib/auth-client'

const currentUserQuery = convexQuery(api.auth.getCurrentUser, {})

const ROLE_LABELS = {
  admin: 'Administrateur',
  student: 'Étudiant',
  parent: 'Parent',
  chef: 'Cuisine',
  distribution: 'Distribution',
} as const

export const Route = createFileRoute('/_authed/app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentUserQuery),
  head: () => ({ meta: [{ title: 'Accueil | Vatel Restauration' }] }),
  component: AppHome,
})

async function signOut() {
  await authClient.signOut()
  window.location.assign('/auth')
}

function AppHome() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const membership = user?.membership
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <BrandLogo className="h-10" />
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOutIcon data-icon="inline-start" />
          Se déconnecter
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Bonjour {user?.name}</h1>
          {membership && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{ROLE_LABELS[membership.role]}</Badge>
              {membership.canteenName}
            </div>
          )}
        </div>
        {membership ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UtensilsIcon />
              </EmptyMedia>
              <EmptyTitle>Aucun menu publié</EmptyTitle>
              <EmptyDescription>Les menus de la semaine apparaîtront ici dès leur publication.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClockIcon />
              </EmptyMedia>
              <EmptyTitle>Compte en attente de rattachement</EmptyTitle>
              <EmptyDescription>
                Votre établissement doit valider votre compte avant que vous puissiez réserver. Contactez le service
                restauration.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </main>
    </div>
  )
}
