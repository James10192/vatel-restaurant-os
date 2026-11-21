import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { authComponent, createAuth } from './auth'
import { cleanName } from './lib/validation'

/**
 * Modification du nom par le titulaire du compte (rattaché ou non : c'est son propre compte).
 * Une seule transaction : le nom Better Auth et la copie montrée au personnel (`profiles.displayName`,
 * commandes du jour) changent ensemble, ou pas du tout. L'identité vient de la session, jamais du client.
 */
export const rename = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { name } = cleanName(args.name, 'Nom')
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) throw new ConvexError('Connexion requise.')
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx)
    await auth.api.updateUser({ body: { name }, headers })
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', user._id))
      .unique()
    if (profile) await ctx.db.patch(profile._id, { displayName: name })
    return null
  },
})
