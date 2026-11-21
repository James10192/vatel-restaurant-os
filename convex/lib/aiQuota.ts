import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { Membership } from './access'

/** Plafond commun à toutes les aides IA d'un établissement, par jour (coût borné, #16 SEC-05). */
export const CANTEEN_DAILY_AI_CALLS = 150

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)

/**
 * Réserve un appel IA pour ce membre, avant l'appel au fournisseur. Null si le plafond du membre
 * ou celui de l'établissement est atteint : l'appelant répond alors sans IA.
 */
export async function takeAiCall(ctx: MutationCtx, membership: Membership, now: number, perMemberDaily: number): Promise<Id<'aiUsage'> | null> {
  const day = dayOf(now)
  const ofCanteen = await ctx.db
    .query('aiUsage')
    .withIndex('by_canteen_day', (q) => q.eq('canteenId', membership.canteenId).eq('day', day))
    .collect()
  if (ofCanteen.reduce((sum, row) => sum + row.calls, 0) >= CANTEEN_DAILY_AI_CALLS) return null
  const mine = ofCanteen.find((row) => row.profileId === membership._id)
  if (mine && mine.calls >= perMemberDaily) return null
  if (mine) {
    await ctx.db.patch(mine._id, { calls: mine.calls + 1 })
    return mine._id
  }
  return await ctx.db.insert('aiUsage', { canteenId: membership.canteenId, profileId: membership._id, day, calls: 1, inputTokens: 0, outputTokens: 0 })
}

/** Ajoute les jetons consommés à la ligne de quota du membre (aucun texte de requête conservé). */
export async function addAiTokens(ctx: MutationCtx, membership: Membership, usageId: Id<'aiUsage'>, tokens: { inputTokens: number; outputTokens: number }) {
  const row = await ctx.db.get(usageId)
  if (!row || row.profileId !== membership._id) return
  await ctx.db.patch(usageId, { inputTokens: row.inputTokens + tokens.inputTokens, outputTokens: row.outputTokens + tokens.outputTokens })
}
