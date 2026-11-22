/**
 * Concierge gestion (administration, cuisine) : chiffres réels d'un jour, simulation d'un imprévu (#5) et
 * points d'attention du copilote (#9). Toujours des lectures et des calculs déterministes, jamais une écriture.
 */
import { ConvexError } from 'convex/values'
import { z } from 'zod'
import { MAX_SIMULATED, dayTotals, demandOf, plannedDemand, simulate, validateInputs } from '../production/plan'
import type { Baseline } from '../production/plan'
import { capability, dayInput, resolveDay } from './capability'

export const day = capability({
  audience: 'kitchen',
  description: 'Chiffres réels d’un jour, par plat et au total : réservations (remises comprises), remises, absents, préparé, demande prévue par le plan validé.',
  input: z.object({ date: dayInput }),
  run: async (reader, input) => {
    const date = resolveDay(reader, input.date)
    const offers = await reader.day(date)
    if (offers.length === 0) return { card: null, data: { date, info: 'Aucune offre publiée ce jour.' } }
    const totals = dayTotals(offers)
    return {
      card: { kind: 'day', date },
      data: {
        date,
        plats: offers.map((o) => ({
          plat: o.dishName,
          service: o.service,
          capacite: o.capacity,
          reservees: o.confirmed + o.pickedUp,
          remises: o.pickedUp,
          absents: o.noShow,
          preparees: o.prepared ?? 'non saisi',
          demandePrevue: plannedDemand(o, o.plan),
          planValide: o.plan !== null,
        })),
        total: {
          capacite: totals.capacity,
          reservees: totals.booked,
          remises: totals.pickedUp,
          absents: totals.noShow,
          preparees: totals.prepared ?? 'non saisi pour tous les plats',
          demandePrevue: totals.demand,
        },
      },
    }
  },
})

const count = z.number().int().min(0).max(MAX_SIMULATED)

export const simulation = capability({
  audience: 'kitchen',
  description:
    'Simule un imprévu sur un jour (absences ou annulations, arrivées en plus, portions préparées supposées) : avant / après, portions évitables ou à ajouter. Hypothèse seulement, rien n’est modifié.',
  input: z.object({
    date: dayInput,
    absences: count.default(0).describe('Réservations qui ne viendront pas'),
    arrivals: count.default(0).describe('Personnes en plus attendues'),
    prepared: count.optional().describe('Portions préparées supposées, si la personne en donne'),
  }),
  run: async (reader, input) => {
    const date = resolveDay(reader, input.date)
    const offers = await reader.day(date)
    if (offers.length === 0) throw new ConvexError('Aucune offre publiée ce jour : rien à simuler.')
    const totals = dayTotals(offers)
    // Une quantité donnée par la personne est une hypothèse : elle remplace le réel sans s'en faire passer pour lui.
    const baseline: Baseline = {
      capacity: totals.capacity,
      confirmed: totals.confirmed,
      pickedUp: totals.pickedUp,
      prepared: input.prepared === undefined ? totals.prepared : null,
    }
    const plan = { walkIns: totals.walkIns, margin: totals.margin }
    // Préparé inconnu et non donné : on suppose la demande prévue couverte (hypothèse signalée sur la carte).
    const assumptions = { ...plan, preparedAssumed: input.prepared ?? demandOf(baseline, plan) }
    const scenario = { cancellations: input.absences, arrivals: input.arrivals }
    const issue = validateInputs(baseline, assumptions, scenario).at(0)
    if (issue) throw new ConvexError(issue.field === 'cancellations' ? `Au plus ${baseline.confirmed} réservations encore annulables ce jour.` : issue.message)
    const result = simulate(baseline, assumptions, scenario)
    return {
      card: { kind: 'simulation', date, ...scenario, preparedAssumed: input.prepared ?? null, capacity: baseline.capacity, ...result },
      data: { date, hypothese: true, ...scenario, preparesSupposees: assumptions.preparedAssumed, preparesConnues: result.preparedKnown, ...result },
    }
  },
})

export const points = capability({
  audience: 'kitchen',
  description: 'Points d’attention calculés par le serveur pour un jour : à faire, à surveiller (stocks, surplus, plan de demain, menus).',
  input: z.object({ date: dayInput }),
  run: async (reader, input) => {
    const date = resolveDay(reader, input.date)
    const list = await reader.points(date)
    const filled = list.map((p) => ({ niveau: p.severity, fait: p.message.replace(/\{(\w+)\}/g, (_, key: string) => String(p.values[key] ?? '')) }))
    return { card: list.length > 0 ? { kind: 'points', date, points: list } : null, data: { date, points: filled.length > 0 ? filled : 'Rien à signaler.' } }
  },
})
