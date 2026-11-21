/**
 * Réglages du service (#4) : horaires, délai de clôture, capacité globale par service et créneaux de retrait.
 * Administration seulement ; la politique est propre à l'établissement du profil.
 */
import { ConvexError, v } from 'convex/values'
import type { Infer } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireAdmin } from './lib/access'
import { policyOf } from './lib/policy'
import { policyValidator } from './schema'

type Policy = Infer<typeof policyValidator>

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const int = (value: number, min: number, max: number, label: string) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new ConvexError(`${label} : entier entre ${min} et ${max}.`)
  return value
}

export const policy = query({
  args: {},
  returns: policyValidator,
  handler: async (ctx) => {
    const { canteenId } = await requireAdmin(ctx)
    const canteen = await ctx.db.get(canteenId)
    if (!canteen) throw new ConvexError('Établissement introuvable.')
    return policyOf(canteen)
  },
})

/** Contrôle complet d'une politique saisie (jamais de valeur partielle enregistrée). */
export function validatePolicy(p: Policy): Policy {
  for (const time of [p.serviceStart.lunch, p.serviceStart.dinner]) if (!HHMM.test(time)) throw new ConvexError('Horaire invalide : format HH:MM attendu.')
  int(p.cutoffMinutes, 0, 1440, 'Délai de clôture (minutes)')
  int(p.demoTopUpMaxXof, 1, 100_000, 'Recharge de démonstration maximale')
  if (p.serviceCapacity) for (const value of [p.serviceCapacity.lunch, p.serviceCapacity.dinner]) int(value, 1, 10_000, 'Capacité du service')
  if (p.slots) {
    int(p.slots.slotMinutes, 5, 120, 'Durée d’un créneau (minutes)')
    int(p.slots.durationMinutes, p.slots.slotMinutes, 360, 'Durée du service (minutes)')
    int(p.slots.slotCapacity, 1, 1000, 'Repas remis par créneau')
  }
  return p
}

export const updatePolicy = mutation({
  args: { policy: policyValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { canteenId } = await requireAdmin(ctx)
    await ctx.db.patch(canteenId, { policy: validatePolicy(args.policy) })
    return null
  },
})
