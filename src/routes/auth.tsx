import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { BrandLogo } from '#/components/brand-logo'
import { AuthIntro } from '#/features/auth/auth-intro'
import { AuthForm } from '#/features/auth/auth-form'
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

// Deux colonnes sur ordinateur (bloc officiel @shadcn/login-02) ; sur mobile, l'accueil précède le formulaire.
function AuthPage() {
  const { redirect: redirectTo, mode } = Route.useSearch()
  const [started, setStarted] = useState(mode === 'signup')
  return (
    <div className="grid min-h-svh md:grid-cols-2">
      <AuthIntro onStart={() => setStarted(true)} className={cn(started && 'max-md:hidden')} />
      <div className={cn('flex flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10', !started && 'max-md:hidden')}>
        <div className="flex w-full max-w-sm flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
          <div className="flex flex-col items-center gap-1 md:hidden">
            <BrandLogo className="h-16" />
            <span className="text-sm font-semibold text-primary">Restauration</span>
          </div>
          <AuthForm mode={mode ?? 'login'} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
