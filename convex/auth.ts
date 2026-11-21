import { betterAuth } from 'better-auth/minimal'
import { createClient  } from '@convex-dev/better-auth'
import type {GenericCtx} from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'
import authConfig from './auth.config'
import { currentUserReturns } from './lib/returns'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) throw new Error('SITE_URL manquant (npx convex env set SITE_URL ...)')
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
    plugins: [convex({ authConfig })],
  })
}

/** Utilisateur connecté (projection minimale) ou null. */
export const getCurrentUser = query({
  args: {},
  returns: currentUserReturns,
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) return null
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', user._id))
      .unique()
    const canteen = profile && (await ctx.db.get(profile.canteenId))
    return {
      name: user.name,
      email: user.email,
      membership: profile && canteen ? { role: profile.role, canteenName: canteen.name } : null,
    }
  },
})
