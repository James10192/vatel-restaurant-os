import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { LOW_BALANCE_XOF } from './notifications'

/**
 * Alerte « solde bas » : seulement quand un débit fait PASSER le solde sous le seuil (franchissement),
 * jamais à chaque réservation suivante. Planifiée dans la transaction du débit : rien ne part si elle échoue.
 */
export async function alertIfLowBalance(
  ctx: MutationCtx,
  profileId: Id<'profiles'>,
  balanceBeforeXof: number,
  balanceAfterXof: number,
) {
  if (balanceBeforeXof < LOW_BALANCE_XOF || balanceAfterXof >= LOW_BALANCE_XOF)
    return
  await ctx.scheduler.runAfter(0, internal.pushSend.deliver, {
    target: { profileId },
    kind: 'lowBalance',
  })
}
