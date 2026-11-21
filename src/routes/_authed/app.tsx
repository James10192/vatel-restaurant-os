import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/_authed/app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(convexQuery(api.auth.getCurrentUser, {})),
  component: AppHome,
})

function AppHome() {
  const { data: user } = useSuspenseQuery(convexQuery(api.auth.getCurrentUser, {}))
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <p className="font-semibold text-primary">Vatel — Restauration</p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await authClient.signOut()
            window.location.assign('/auth')
          }}
        >
          Se déconnecter
        </Button>
      </header>
      <h1 className="text-2xl font-bold">Bonjour {user?.name ?? ''}</h1>
      <p className="text-muted-foreground">Votre espace repas arrive au prochain lot.</p>
    </main>
  )
}
