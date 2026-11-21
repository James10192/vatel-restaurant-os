import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } =
  convexBetterAuthReactStart({
    convexUrl: requireEnv('VITE_CONVEX_URL'),
    convexSiteUrl: requireEnv('VITE_CONVEX_SITE_URL'),
  })
