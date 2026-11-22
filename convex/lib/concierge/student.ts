/**
 * Concierge usager : menu publié, solde, réservations, proposition dans un budget (moteur B1).
 * Prix, places, allergènes et budget viennent de la base et des règles, jamais du modèle.
 */
import { ConvexError } from 'convex/values'
import { z } from 'zod'
import { addDays } from '../dates'
import { REQUEST_BOUNDS, parseRequest } from '../smartMenu/contract'
import { evaluate, planByRules } from '../smartMenu/rules'
import type { Reader } from './capability'
import { capability, clock, dayInput, resolveDay } from './capability'

/** Jours lus à partir de `from` (même horizon que l'Aide au choix). */
const horizon = (from: string) => Array.from({ length: REQUEST_BOUNDS.horizonDays + 1 }, (_, i) => addDays(from, i))

async function upcomingOffers(reader: Reader, from: string, dayCount: number) {
  const start = from < reader.today ? reader.today : from
  const rows = await reader.offers(horizon(start))
  const days = [...new Set(rows.map((r) => r.date))].sort().slice(0, dayCount)
  return { days, rows: rows.filter((r) => days.includes(r.date)) }
}

export const menu = capability({
  audience: 'student',
  description: 'Plats du menu publié sur les prochains jours où il y a un menu : prix, places restantes, heure limite.',
  input: z.object({ from: dayInput.default('today'), days: z.number().int().min(1).max(REQUEST_BOUNDS.maxDays).default(3) }),
  run: async (reader, { from, days }) => {
    const { rows } = await upcomingOffers(reader, resolveDay(reader, from), days)
    if (rows.length === 0) return { card: null, data: { info: 'Aucun menu publié sur ces jours.' } }
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service))
    return {
      card: { kind: 'offers', items: sorted.map((r) => ({ menuItemId: r.id, date: r.date })) },
      data: {
        plats: sorted.map((r) => ({
          date: r.date,
          service: r.service,
          plat: r.dishName,
          prixXof: r.priceXof,
          portionsRestantes: r.remaining,
          reservableJusqua: clock(r.bookableUntil),
          reservable: r.remaining > 0 && reader.now < r.bookableUntil && !r.alreadyBooked,
          dejaReserveCeService: r.alreadyBooked,
        })),
        allergenes: 'Affichés sur chaque carte, tels que déclarés par l’établissement.',
      },
    }
  },
})

export const balance = capability({
  audience: 'student',
  description: 'Solde de crédits de démonstration de la personne.',
  input: z.object({}),
  run: async (reader) => ({ card: { kind: 'balance' }, data: { soldeXof: await reader.balance(), recharge: 'Simulation de démonstration, depuis la page Solde.' } }),
})

export const bookings = capability({
  audience: 'student',
  description: 'Réservations à venir de la personne (plat, date, service, prix, heure limite d’annulation).',
  input: z.object({}),
  run: async (reader) => {
    const active = (await reader.bookings()).filter((b) => b.status === 'confirmed')
    return {
      card: { kind: 'bookings' },
      data: { reservations: active.map((b) => ({ date: b.date, service: b.service, plat: b.dishName, prixXof: b.priceXof, annulableJusqua: clock(b.cancellableUntil) })) },
    }
  },
})

export const plan = capability({
  audience: 'student',
  description:
    'Propose un repas par jour dans un budget, sur les prochains jours avec menu, en évitant des allergènes. Calcul par les règles du serveur ; rien n’est réservé.',
  input: z.object({
    budgetXof: z.number().int().describe('Budget total en FCFA, entier'),
    days: z.number().int().min(1).max(REQUEST_BOUNDS.maxDays).describe('Nombre de jours avec menu à couvrir'),
    from: dayInput.default('today'),
    service: z.enum(['lunch', 'dinner', 'any']).default('any'),
    avoid: z.array(z.string().max(40)).max(REQUEST_BOUNDS.maxAvoid).default([]).describe('Allergènes à éviter, tels que nommés par la personne'),
  }),
  run: async (reader, input) => {
    const { days, rows } = await upcomingOffers(reader, resolveDay(reader, input.from), input.days)
    if (days.length === 0) throw new ConvexError('Aucun menu publié sur les prochains jours.')
    const request = parseRequest({ ...input, days }, reader.today, addDays)
    const result = planByRules(evaluate(rows, request, reader.now), request)
    return {
      card: {
        kind: 'plan',
        budgetXof: request.budgetXof,
        totalXof: result.totalXof,
        items: result.picks.map(({ offer }) => ({ menuItemId: offer.id, date: offer.date })),
        uncovered: result.uncovered,
      },
      data: {
        budgetXof: request.budgetXof,
        totalXof: result.totalXof,
        resteXof: request.budgetXof - result.totalXof,
        repas: result.picks.map(({ offer }) => ({ date: offer.date, service: offer.service, plat: offer.dishName, prixXof: offer.priceXof })),
        joursNonCouverts: result.uncovered,
        aConfirmer: 'Rien n’est réservé : la personne confirme chaque repas sur la carte.',
      },
    }
  },
})
