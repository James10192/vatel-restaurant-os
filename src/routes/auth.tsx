import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { BrandLogo } from '#/components/brand-logo'
import { AuthForm } from '#/features/auth/auth-form'
import { AuthIntro } from '#/features/auth/auth-intro'
import { cn } from '#/lib/utils'

const isInternalPath = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): { redirect: string; mode?: 'signup' } => ({
    redirect: isInternalPath(search.redirect) ? search.redirect : '/app',
    mode: search.mode === 'signup' ? 'signup' : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.isAuthenticated) throw redirect({ to: search.redirect })
  },
  head: () => ({ meta: [{ title: 'Connexion | Vatel Restauration' }] }),
  component: AuthPage,
})

/**
 * Accueil plein écran, puis « Glisser pour commencer » :
 * ordinateur, l'accueil se replie à 50 % et le formulaire entre à droite ; mobile, le formulaire remplace l'accueil.
 */
function AuthPage() {
  const { redirect: redirectTo, mode } = Route.useSearch()
  const [started, setStarted] = useState(mode === 'signup')
  return (
    <div className="flex min-h-svh overflow-hidden bg-background">
      <AuthIntro
        started={started}
        onStart={() => setStarted(true)}
        className={cn(
          'w-full shrink-0 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-in-out',
          started && 'max-md:hidden md:w-1/2',
        )}
      />
      {started && (
        <main className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted px-6 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:delay-300 motion-safe:duration-700 motion-safe:fill-mode-both">
          <div className="flex w-full max-w-md flex-col gap-8">
            <div className="flex justify-center md:hidden">
              <BrandLogo className="h-16" />
            </div>
            <AuthForm mode={mode ?? 'login'} redirectTo={redirectTo} />
            <p className="text-center text-xs text-muted-foreground">
              Prototype étudiant du hackathon Vatel × Epitech. Données fictives.
            </p>
          </div>
        </main>
      )}
    </div>
  )
}
