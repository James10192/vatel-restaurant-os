import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import { requireMember } from './lib/access'
import { appendEntry, findWallet, getOrCreateWallet } from './lib/ledger'
import { DEMO_BALANCE_MAX_XOF, policyOf } from './lib/policy'
import { assertIdempotencyKey } from './lib/validation'
import { walletHistoryReturns } from './lib/returns'

/** Solde du membre connecté (0 tant qu'aucun mouvement). */
export const balance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const wallet = await findWallet(ctx, await requireMember(ctx))
    return wallet?.balanceXof ?? 0
  },
})

/** Historique paginé côté serveur, du plus récent au plus ancien. */
export const history = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: walletHistoryReturns,
  handler: async (ctx, { paginationOpts }) => {
    const wallet = await findWallet(ctx, await requireMember(ctx))
    if (!wallet) return { page: [], isDone: true, continueCursor: '' }
    const result = await ctx.db
      .query('walletEntries')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .paginate(paginationOpts)
    return {
      ...result,
      page: result.page.map(({ _id, _creationTime, kind, amountXof, balanceAfterXof, label }) => ({
        _id,
        _creationTime,
        kind,
        amountXof,
        balanceAfterXof,
        label,
      })),
    }
  },
})

/**
 * Recharge de DÉMONSTRATION : crédits fictifs, aucun paiement réel (PAY-01, #16).
 * Idempotente : la même clé avec le même montant ne crédite qu'une fois ; un autre montant est refusé.
 */
export const topUpDemo = mutation({
  args: { amountXof: v.number(), idempotencyKey: v.string() },
  returns: v.object({ balanceXof: v.number(), replayed: v.boolean() }),
  handler: async (ctx, { amountXof, idempotencyKey }) => {
    assertIdempotencyKey(idempotencyKey)
    const membership = await requireMember(ctx)
    const canteen = await ctx.db.get(membership.canteenId)
    if (!canteen) throw new ConvexError('Établissement introuvable.')
    const max = policyOf(canteen).demoTopUpMaxXof
    if (!Number.isSafeInteger(amountXof) || amountXof <= 0 || amountXof > max) {
      throw new ConvexError(`Recharge de démonstration : entre 1 et ${max} FCFA.`)
    }
    const wallet = await getOrCreateWallet(ctx, membership)
    const previous = await ctx.db
      .query('walletEntries')
      .withIndex('by_wallet_key', (q) => q.eq('walletId', wallet._id).eq('idempotencyKey', idempotencyKey))
      .unique()
    if (previous) {
      if (previous.amountXof !== amountXof) throw new ConvexError('Demande déjà traitée avec un autre montant.')
      return { balanceXof: wallet.balanceXof, replayed: true }
    }
    if (wallet.balanceXof + amountXof > DEMO_BALANCE_MAX_XOF) {
      throw new ConvexError(`Solde de démonstration plafonné à ${DEMO_BALANCE_MAX_XOF} FCFA.`)
    }
    const balanceXof = await appendEntry(ctx, wallet, {
      kind: 'demo_top_up',
      amountXof,
      label: 'Recharge de démonstration (fictive)',
      idempotencyKey,
    })
    return { balanceXof, replayed: false }
  },
})
