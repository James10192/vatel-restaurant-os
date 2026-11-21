import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent, createAuth } from './auth'
import { cleanName } from './lib/validation'
import { requireMember } from './lib/access'
import { allergyListValidator, cleanAllergyList } from './lib/allergies'

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

/** Allergies déclarées par le membre connecté (jamais celles d'un autre). */
export const myAllergies = query({
  args: {},
  returns: allergyListValidator,
  handler: async (ctx) => {
    const { allergies } = await requireMember(ctx)
    return allergies ?? { codes: [], others: [] }
  },
})

/** La personne déclare elle-même ses allergies ; elles servent à l'alerter sur les plats de la semaine. */
export const setMyAllergies = mutation({
  args: allergyListValidator,
  returns: allergyListValidator,
  handler: async (ctx, list) => {
    const membership = await requireMember(ctx)
    const clean = cleanAllergyList(list)
    await ctx.db.patch(membership._id, { allergies: clean })
    return clean
  },
})
