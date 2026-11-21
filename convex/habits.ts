/**
 * Habitudes (#3) : l'équivalent d'un abonnement, sans réservation implicite. Elles pré-remplissent l'aide au
 * choix ; l'usager confirme chaque semaine (réservation groupée, tout ou rien). Données de l'usager seulement.
 */
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireMember } from './lib/access'
import { REQUEST_BOUNDS } from './lib/smartMenu/contract'

const habitValidator = v.object({
  weekdays: v.array(v.number()),
  budgetXof: v.number(),
  service: v.union(v.literal('any'), v.literal('lunch'), v.literal('dinner')),
  avoid: v.array(v.string()),
})

export const mine = query({
  args: {},
  returns: v.union(v.null(), habitValidator),
  handler: async (ctx) => {
    const membership = await requireMember(ctx)
    const habit = await ctx.db.query('mealHabits').withIndex('by_profile', (q) => q.eq('profileId', membership._id)).unique()
    return habit ? { weekdays: habit.weekdays, budgetXof: habit.budgetXof, service: habit.service, avoid: habit.avoid } : null
  },
})

export const save = mutation({
  args: { habit: habitValidator },
  returns: v.null(),
  handler: async (ctx, { habit }) => {
    const membership = await requireMember(ctx)
    const weekdays = [...new Set(habit.weekdays)].sort()
    if (weekdays.length === 0 || weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) throw new ConvexError('Jours : de 1 (lundi) à 7 (dimanche).')
    if (!Number.isInteger(habit.budgetXof) || habit.budgetXof < 1 || habit.budgetXof > REQUEST_BOUNDS.maxBudgetXof) {
      throw new ConvexError(`Budget : entier entre 1 et ${REQUEST_BOUNDS.maxBudgetXof} FCFA.`)
    }
    if (habit.avoid.length > REQUEST_BOUNDS.maxAvoid || habit.avoid.some((name) => name.length > 40)) throw new ConvexError('Liste d’allergènes à éviter trop longue.')
    const clean = { ...habit, weekdays, avoid: [...new Set(habit.avoid.map((a) => a.trim()).filter(Boolean))] }
    const existing = await ctx.db.query('mealHabits').withIndex('by_profile', (q) => q.eq('profileId', membership._id)).unique()
    if (existing) await ctx.db.patch(existing._id, clean)
    else await ctx.db.insert('mealHabits', { profileId: membership._id, ...clean })
    return null
  },
})

export const clear = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const membership = await requireMember(ctx)
    const existing = await ctx.db.query('mealHabits').withIndex('by_profile', (q) => q.eq('profileId', membership._id)).unique()
    if (existing) await ctx.db.delete(existing._id)
    return null
  },
})
