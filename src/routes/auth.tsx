import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { BrandLogo } from '#/components/brand-logo'
import { AuthForm } from '#/features/auth/auth-form'
import { AuthIntro } from '#/features/auth/auth-intro'
import { safeRedirectPath } from '#/lib/safe-redirect'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: 'signup' } => ({
    redirect: safeRedirectPath(search.redirect),
    mode: search.mode === 'signup' ? 'signup' : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.isAuthenticated) throw redirect({ to: search.redirect ?? '/app' })
  },
  head: () => ({ meta: [{ title: 'Connexion | Vatel Restauration' }] }),
  component: AuthPage,
})

/**
 * Accueil plein écran, puis « Glisser pour commencer » :
 * ordinateur, l'accueil se replie à 50 % et le formulaire entre à droite ; mobile, le formulaire remplace l'accueil.
 */
function AuthPage() {
  const { redirect: redirectParam, mode } = Route.useSearch()
  const redirectTo = redirectParam ?? '/app'
  const [started, setStarted] = useState(mode === 'signup')
  return (
    <div className={cn('flex min-h-svh overflow-hidden bg-background text-foreground', started && 'dark')}>
      <AuthIntro
        started={started}
        onStart={() => setStarted(true)}
        className={cn(
          'w-full shrink-0 motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-in-out',
          // Après le glissement : la photo devient une carte encadrée et arrondie à gauche.
          started && 'max-md:hidden md:m-3 md:min-h-[calc(100svh-1.5rem)] md:w-[calc(50%-1.5rem)] md:rounded-[2rem]',
        )}
      />
      {started && (
        <main className="flex min-h-svh flex-1 flex-col items-center justify-center px-6 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:delay-300 motion-safe:duration-700 motion-safe:fill-mode-both">
          <div className="flex w-full max-w-md flex-col gap-8">
            <div className="flex justify-center md:hidden">
              <span className="rounded-xl bg-white p-1.5">
                <BrandLogo className="h-14" />
              </span>
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
