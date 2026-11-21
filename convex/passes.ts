import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCounter, requireMember } from './lib/access'
import { todayUtc } from './lib/dates'
import type { Membership } from './lib/access'
import { PASS_REFUSALS, PASS_VERDICTS, endOfDay, generateCode, hashCode, normalizeCode } from './lib/pass'
import type { PassVerdict } from './lib/pass'
import { serviceValidator } from './schema'


/**
 * QR de retrait (#4 B3). L'usager affiche un code opaque ; le personnel le scanne (ou le saisit), voit
 * le repas et le nom, vérifie la personne, puis confirme la remise. Le code seul ne prouve pas l'identité (#16 SEC-08).
 */

/** Émet (ou réémet) le pass d'une réservation confirmée de l'usager. L'ancien code devient inutilisable. */
export const issue = mutation({
  args: { bookingId: v.id('bookings') },
  returns: v.object({ code: v.string(), expiresAt: v.number() }),
  handler: async (ctx, { bookingId }) => {
    const membership = await requireMember(ctx)
    const booking = await ctx.db.get(bookingId)
    if (!booking || booking.profileId !== membership._id) throw new ConvexError('Réservation introuvable.')
    if (booking.status !== 'confirmed') throw new ConvexError('Seule une réservation confirmée a un QR de retrait.')
    if (booking.date < todayUtc()) throw new ConvexError('Ce repas est passé.')
    const previous = await ctx.db.query('bookingPasses').withIndex('by_booking', (q) => q.eq('bookingId', bookingId)).collect()
    await Promise.all(previous.filter((p) => p.usedAt === undefined).map((p) => ctx.db.delete(p._id)))
    const code = generateCode()
    const expiresAt = endOfDay(booking.date)
    await ctx.db.insert('bookingPasses', { canteenId: booking.canteenId, bookingId, codeHash: await hashCode(code), expiresAt })
    return { code, expiresAt }
  },
})

const verdictValidator = v.union(...PASS_VERDICTS.map((verdict) => v.literal(verdict)))
type Verdict = PassVerdict

/**
 * Lecture d'un code par le personnel, sans rien modifier. Un code d'un autre établissement est « inconnu » :
 * aucune information ne fuit. L'ordre des contrôles donne le motif le plus utile au comptoir.
 */
type Evaluation =
  | { verdict: 'invalid' | 'unknown'; found: null }
  | { verdict: Exclude<Verdict, 'invalid' | 'unknown'>; found: { pass: Doc<'bookingPasses'>; booking: Doc<'bookings'> } }

async function evaluate(ctx: QueryCtx, membership: Membership, rawCode: string): Promise<Evaluation> {
  const code = normalizeCode(rawCode.slice(0, 64))
  if (!code) return { verdict: 'invalid', found: null }
  const codeHash = await hashCode(code)
  const pass = await ctx.db.query('bookingPasses').withIndex('by_code_hash', (q) => q.eq('codeHash', codeHash)).unique()
  const booking = pass && pass.canteenId === membership.canteenId ? await ctx.db.get(pass.bookingId) : null
  if (!pass || !booking) return { verdict: 'unknown', found: null }
  const verdict =
    pass.usedAt !== undefined || booking.status === 'picked_up'
      ? 'used'
      : booking.status === 'cancelled'
        ? 'cancelled'
        : Date.now() > pass.expiresAt
          ? 'expired'
          : booking.date !== todayUtc()
            ? 'wrong_day'
            : 'ready'
  return { verdict, found: { pass, booking } }
}

const inspectReturns = v.object({
  verdict: verdictValidator,
  meal: v.union(
    v.null(),
    v.object({
      diner: v.string(),
      dishName: v.string(),
      date: v.string(),
      service: serviceValidator,
      slot: v.optional(v.string()),
      usedAt: v.union(v.null(), v.number()),
    }),
  ),
})

/** Aperçu d'un code scanné : repas, nom affiché et verdict. Aucune écriture. */
export const inspect = query({
  args: { code: v.string() },
  returns: inspectReturns,
  handler: async (ctx, { code }) => {
    const membership = await requireCounter(ctx)
    const { verdict, found } = await evaluate(ctx, membership, code)
    if (!found) return { verdict, meal: null }
    const { pass, booking } = found
    const profile = await ctx.db.get(booking.profileId)
    return {
      verdict,
      meal: {
        diner: profile?.displayName ?? 'Membre',
        dishName: booking.dishName,
        date: booking.date,
        service: booking.service,
        slot: booking.slot,
        usedAt: pass.usedAt ?? null,
      },
    }
  },
})

/** Remise par QR : contrôles relus dans la transaction, consommation unique (le second scan est refusé). */
export const redeem = mutation({
  args: { code: v.string() },
  returns: v.object({ dishName: v.string() }),
  handler: async (ctx, { code }) => {
    const membership = await requireCounter(ctx)
    const evaluation = await evaluate(ctx, membership, code)
    if (evaluation.verdict !== 'ready') throw new ConvexError(PASS_REFUSALS[evaluation.verdict])
    const { pass, booking } = evaluation.found
    await ctx.db.patch(booking._id, { status: 'picked_up' })
    await ctx.db.patch(pass._id, { usedAt: Date.now(), usedBy: membership._id })
    return { dishName: booking.dishName }
  },
})
