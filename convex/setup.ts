import { ConvexError, v } from 'convex/values'
import { components } from './_generated/api'
import { internalMutation } from './_generated/server'
import { createAuth } from './auth'
import { roleValidator } from './schema'

// Alphabet sans caractères ambigus (0/O, 1/l/I) : ce n'est pas un secret.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' // gitleaks:allow

function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('')
}

/**
 * Amorçage unique : crée le premier établissement et son administrateur.
 * Interne (jamais exposé au client) : `pnpm exec convex run setup:bootstrap '{...}'`.
 * Refuse de s'exécuter dès qu'un établissement existe (SEC-02, #16).
 */
export const bootstrap = internalMutation({
  args: {
    canteenName: v.string(),
    canteenSlug: v.string(),
    adminName: v.string(),
    adminEmail: v.string(),
  },
  returns: v.object({ adminEmail: v.string(), temporaryPassword: v.string() }),
  handler: async (ctx, args) => {
    if (await ctx.db.query('canteens').first()) {
      throw new ConvexError('Amorçage déjà effectué : un établissement existe.')
    }
    const temporaryPassword = generatePassword()
    const { user } = await createAuth(ctx).api.signUpEmail({
      body: { name: args.adminName, email: args.adminEmail, password: temporaryPassword },
    })
    const canteenId = await ctx.db.insert('canteens', { name: args.canteenName, slug: args.canteenSlug })
    await ctx.db.insert('profiles', { authUserId: user.id, canteenId, role: 'admin' })
    return { adminEmail: args.adminEmail, temporaryPassword }
  },
})

/**
 * Rattache un compte déjà inscrit à l'établissement unique de démo (CLI uniquement,
 * en attendant l'écran /admin/users P1). Refuse un compte déjà rattaché.
 */
export const attachAccount = internalMutation({
  args: { email: v.string(), role: roleValidator },
  returns: v.null(),
  handler: async (ctx, { email, role }) => {
    const canteen = await ctx.db.query('canteens').first()
    if (!canteen) throw new ConvexError('Aucun établissement : lancer setup:bootstrap.')
    const found = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'user',
      where: [{ field: 'email', value: email.trim().toLowerCase() }],
    })
    if (!found) throw new ConvexError('Aucun compte inscrit avec cet e-mail.')
    const authUserId = String(found._id)
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUserId))
      .unique()
    if (existing) throw new ConvexError('Compte déjà rattaché.')
    await ctx.db.insert('profiles', { authUserId, canteenId: canteen._id, role })
    return null
  },
})
