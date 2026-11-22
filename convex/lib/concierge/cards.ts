/**
 * Concierge (#45) : cartes renvoyées avec chaque réponse. Construites par le serveur à partir des outils
 * exécutés, jamais par le modèle. Elles portent des références (offre, date) : l'interface les affiche depuis
 * les requêtes réactives habituelles, donc à jour en temps réel, avec les prix et allergènes lus en base.
 */
import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { pointValidator } from '../copilot/brief'

const offerRef = v.object({ menuItemId: v.id('menuItems'), date: v.string() })
const snapshot = v.object({ demand: v.number(), prepared: v.number(), missing: v.number(), surplus: v.number() })

export const cardValidator = v.union(
  /** Plats du menu publié (lus en direct par l'interface ; « Réserver » ouvre la confirmation habituelle). */
  v.object({ kind: v.literal('offers'), items: v.array(offerRef) }),
  /** Solde (lu en direct ; « Recharger » mène au solde). */
  v.object({ kind: v.literal('balance') }),
  /** Réservations à venir (lues en direct). */
  v.object({ kind: v.literal('bookings') }),
  /** Proposition du moteur Aide au choix (B1) : règles serveur, aucune réservation implicite. */
  v.object({
    kind: v.literal('plan'),
    budgetXof: v.number(),
    totalXof: v.number(),
    items: v.array(offerRef),
    uncovered: v.array(v.object({ date: v.string(), reason: v.union(v.literal('no_menu'), v.literal('unavailable'), v.literal('allergens'), v.literal('budget')) })),
  }),
  /** Chiffres d'un jour de production (lus en direct). */
  v.object({ kind: v.literal('day'), date: v.string() }),
  /** Simulation d'un imprévu (#5) : hypothèse, rien n'est modifié. */
  v.object({
    kind: v.literal('simulation'),
    date: v.string(),
    cancellations: v.number(),
    arrivals: v.number(),
    preparedAssumed: v.union(v.null(), v.number()),
    capacity: v.number(),
    before: snapshot,
    after: snapshot,
    avoidable: v.number(),
    extra: v.number(),
    capacityOverflow: v.number(),
    preparedKnown: v.boolean(),
    recommendation: v.union(v.literal('reduce'), v.literal('increase'), v.literal('hold'), v.literal('stop')),
  }),
  /** Points d'attention déterministes du copilote (#9). */
  v.object({ kind: v.literal('points'), date: v.string(), points: v.array(pointValidator) }),
)
export type Card = Infer<typeof cardValidator>

export const replyValidator = v.object({
  source: v.union(v.literal('ai'), v.literal('rules')),
  notice: v.optional(v.string()),
  text: v.string(),
  cards: v.array(cardValidator),
})
export type Reply = Infer<typeof replyValidator>

/** Au plus 4 cartes par réponse, sans doublon (même outil appelé deux fois avec les mêmes paramètres). */
export function uniqueCards(cards: Array<Card>, max = 4): Array<Card> {
  const seen = new Set<string>()
  return cards.filter((card) => {
    const key = JSON.stringify(card)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(-max)
}
