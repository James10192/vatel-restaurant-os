import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'

/** Libellé d'un membre sans nom affiché (jamais d'e-mail ni d'identifiant). */
export const MEMBER_FALLBACK = 'Membre'

/** Noms affichés de membres, une lecture par personne distincte. */
export async function memberNames(ctx: QueryCtx, ids: Array<Id<'profiles'>>): Promise<Map<Id<'profiles'>, string>> {
  const unique = [...new Set(ids)]
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)))
  return new Map(unique.map((id, i) => [id, docs[i]?.displayName ?? MEMBER_FALLBACK]))
}

/** Noms d'unités, une lecture par unité distincte ; « ? » si l'unité n'existe plus. */
export async function unitNames(ctx: QueryCtx, ids: Array<Id<'units'>>): Promise<Map<Id<'units'>, string>> {
  const unique = [...new Set(ids)]
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)))
  return new Map(unique.map((id, i) => [id, docs[i]?.name ?? '?']))
}
