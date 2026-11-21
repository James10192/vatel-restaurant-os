import { ConvexError, v } from 'convex/values'
import { components } from './_generated/api'
import type { MutationCtx } from './_generated/server'
import { internalMutation } from './_generated/server'
import { roleValidator } from './schema'
import { cleanName } from './lib/validation'

/*
 * Procédures OPÉRATEUR, internes : jamais appelables depuis le navigateur, seulement via
 * `pnpm exec convex run setup:<fonction>` par un détenteur de l'accès au déploiement (SEC-02, #16).
 * Aucune ne crée ni ne transmet de mot de passe : la personne s'inscrit elle-même sur /auth (sans droit),
 * puis l'opérateur la rattache.
 */

const accountSummary = v.object({ email: v.string(), name: v.string(), registeredAt: v.string() })

/** Compte Better Auth existant pour cet e-mail, sinon erreur explicite. */
async function findRegisteredAccount(ctx: MutationCtx, email: string) {
  const found = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'user',
    where: [{ field: 'email', value: email.trim().toLowerCase() }],
  })
  if (!found) throw new ConvexError('Aucun compte inscrit avec cet e-mail : la personne doit d’abord s’inscrire sur /auth.')
  return {
    authUserId: String(found._id),
    summary: {
      email: String(found.email),
      name: String(found.name),
      registeredAt: new Date(Number(found.createdAt)).toISOString(),
    },
  }
}

async function assertNotAttached(ctx: MutationCtx, authUserId: string) {
  const existing = await ctx.db
    .query('profiles')
    .withIndex('by_auth_user', (q) => q.eq('authUserId', authUserId))
    .unique()
  if (existing) throw new ConvexError('Compte déjà rattaché.')
}

/**
 * Amorçage unique : crée le premier établissement et en fait administrateur un compte DÉJÀ inscrit.
 * Refuse dès qu'un établissement existe. Renvoie l'identité promue pour vérification par l'opérateur
 * (nom et date d'inscription), afin de détecter une inscription usurpant l'e-mail prévu.
 */
export const bootstrap = internalMutation({
  args: { canteenName: v.string(), canteenSlug: v.string(), adminEmail: v.string() },
  returns: accountSummary,
  handler: async (ctx, args) => {
    if (await ctx.db.query('canteens').first()) {
      throw new ConvexError('Amorçage déjà effectué : un établissement existe.')
    }
    const { authUserId, summary } = await findRegisteredAccount(ctx, args.adminEmail)
    await assertNotAttached(ctx, authUserId)
    const { name } = cleanName(args.canteenName, 'Nom de l’établissement')
    const canteenId = await ctx.db.insert('canteens', { name, slug: args.canteenSlug.trim().toLowerCase() })
    await ctx.db.insert('profiles', { authUserId, canteenId, role: 'admin', displayName: summary.name })
    return summary
  },
})

/** Complète le nom affiché des profils rattachés avant l'ajout de ce champ (idempotent). */
export const backfillDisplayNames = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let updated = 0
    for (const profile of await ctx.db.query('profiles').collect()) {
      if (profile.displayName) continue
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: 'user',
        where: [{ field: '_id', value: profile.authUserId }],
      })
      if (!user) continue
      await ctx.db.patch(profile._id, { displayName: String(user.name) })
      updated++
    }
    return updated
  },
})

/**
 * Rattache un compte inscrit à un établissement nommé, avec un rôle (en attendant l'écran /admin/users P1).
 * Refuse un compte déjà rattaché : un changement de rôle n'est jamais implicite.
 */
export const attachAccount = internalMutation({
  args: { canteenSlug: v.string(), email: v.string(), role: roleValidator },
  returns: accountSummary,
  handler: async (ctx, { canteenSlug, email, role }) => {
    const canteen = await ctx.db
      .query('canteens')
      .withIndex('by_slug', (q) => q.eq('slug', canteenSlug.trim().toLowerCase()))
      .unique()
    if (!canteen) throw new ConvexError('Établissement introuvable pour ce slug.')
    const { authUserId, summary } = await findRegisteredAccount(ctx, email)
    await assertNotAttached(ctx, authUserId)
    await ctx.db.insert('profiles', { authUserId, canteenId: canteen._id, role, displayName: summary.name })
    return summary
  },
})
