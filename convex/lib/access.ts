import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'

export type Membership = Doc<'profiles'>

/**
 * Profil de l'utilisateur connecté, ou null s'il n'est pas connecté ou pas rattaché.
 * L'identité vient du JWT Better Auth validé par Convex (`subject` = id utilisateur) ;
 * une déconnexion révoque l'accès au plus tard à l'expiration du jeton.
 */
export async function getMembership(ctx: QueryCtx): Promise<Membership | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query('profiles')
    .withIndex('by_auth_user', (q) => q.eq('authUserId', identity.subject))
    .unique()
}

/** Exige un compte rattaché. L'établissement vient toujours du profil, jamais du client. */
export async function requireMember(ctx: QueryCtx): Promise<Membership> {
  const membership = await getMembership(ctx)
  if (!membership) throw new ConvexError('Compte non rattaché à un établissement.')
  return membership
}

export async function requireAdmin(ctx: QueryCtx): Promise<Membership> {
  const membership = await requireMember(ctx)
  if (membership.role !== 'admin') throw new ConvexError('Action réservée à l’administration.')
  return membership
}

/** Cuisine et gestion : administration ou chef de cuisine (#5, #6). Usagers, parents et distribution refusés. */
export async function requireKitchen(ctx: QueryCtx): Promise<Membership> {
  const membership = await requireMember(ctx)
  if (membership.role !== 'admin' && membership.role !== 'chef') throw new ConvexError('Action réservée à la cuisine et à l’administration.')
  return membership
}

/** Remise des repas : administration ou agent de distribution (#4). */
export async function requireCounter(ctx: QueryCtx): Promise<Membership> {
  const membership = await requireMember(ctx)
  if (membership.role !== 'admin' && membership.role !== 'distribution') throw new ConvexError('Action réservée au personnel de distribution.')
  return membership
}

/** Charge un document et vérifie qu'il appartient à l'établissement du membre (isolation tenant). */
export async function getOwned<T extends 'dishes' | 'menuItems' | 'units' | 'ingredients'>(
  ctx: QueryCtx,
  membership: Membership,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(id)
  if (!doc || doc.canteenId !== membership.canteenId) throw new ConvexError('Élément introuvable.')
  return doc
}
