import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { LogOutIcon, UtensilsIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { BrandLogo } from '#/components/brand-logo'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { authClient } from '#/lib/auth-client'

const currentUserQuery = convexQuery(api.auth.getCurrentUser, {})

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
        <h1 className="text-2xl font-bold">Bonjour {user?.name}</h1>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun menu publié</EmptyTitle>
            <EmptyDescription>Les menus de la semaine apparaîtront ici dès leur publication.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </div>
  )
}
