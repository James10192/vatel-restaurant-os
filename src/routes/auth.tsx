import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthForm } from '#/features/auth/auth-form'

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
      ? search.redirect
      : '/app',
  }),
  beforeLoad: ({ context, search }) => {
    if (context.isAuthenticated) throw redirect({ to: search.redirect })
  },
  component: AuthPage,
})

function AuthPage() {
  const { redirect: redirectTo } = Route.useSearch()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
      <AuthForm redirectTo={redirectTo} />
    </main>
  )
}
