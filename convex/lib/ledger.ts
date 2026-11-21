import { ConvexError } from 'convex/values'
import type { Infer } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { walletEntryKindValidator } from '../schema'
import type { Membership } from './access'

export async function findWallet(ctx: QueryCtx, membership: Membership): Promise<Doc<'wallets'> | null> {
  return await ctx.db
    .query('wallets')
    .withIndex('by_profile', (q) => q.eq('profileId', membership._id))
    .unique()
}

export async function getOrCreateWallet(ctx: MutationCtx, membership: Membership): Promise<Doc<'wallets'>> {
  const existing = await findWallet(ctx, membership)
  if (existing) return existing
  const id = await ctx.db.insert('wallets', { canteenId: membership.canteenId, profileId: membership._id, balanceXof: 0 })
  const wallet = await ctx.db.get(id)
  if (!wallet) throw new ConvexError('Portefeuille introuvable.')
  return wallet
}

type Entry = {
  kind: Infer<typeof walletEntryKindValidator>
  amountXof: number
  label: string
  bookingId?: Id<'bookings'>
  idempotencyKey?: string
}

/**
 * Seule façon de modifier un solde : écriture ajoutée au journal et solde mis à jour dans la même
 * transaction. Refuse tout solde négatif et tout montant non entier.
 */
export async function appendEntry(ctx: MutationCtx, wallet: Doc<'wallets'>, entry: Entry): Promise<number> {
  if (!Number.isSafeInteger(entry.amountXof) || entry.amountXof === 0) {
    throw new ConvexError('Montant invalide.')
  }
  const balanceAfterXof = wallet.balanceXof + entry.amountXof
  if (balanceAfterXof < 0) throw new ConvexError('Solde insuffisant.')
  await ctx.db.insert('walletEntries', { canteenId: wallet.canteenId, walletId: wallet._id, balanceAfterXof, ...entry })
  await ctx.db.patch(wallet._id, { balanceXof: balanceAfterXof })
  return balanceAfterXof
}
