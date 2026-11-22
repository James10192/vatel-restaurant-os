/**
 * Concierge (#45) : une « capacité » est une lecture autorisée pour un public (usager ou cuisine). Elle est
 * définie une seule fois et sert deux chemins : outil proposé au modèle, et raccourci sans IA. Elle renvoie
 * une carte (pour l'interface) et des données (pour le modèle). Aucune capacité n'écrit en base.
 */
import { ConvexError } from 'convex/values'
import { z } from 'zod'
import type { Id } from '../../_generated/dataModel'
import { addDays, isIsoDate } from '../dates'
import type { Point } from '../copilot/brief'
import type { DayOfferFigures } from '../production/plan'
import type { OfferRow, Service } from '../smartMenu/rules'
import type { Card } from './cards'
import type { Audience } from './quick'

export type { Audience }

/** Lectures disponibles : chacune passe par une fonction Convex qui revérifie identité, rôle et établissement. */
export type Reader = {
  today: string
  now: number
  offers: (days: Array<string>) => Promise<Array<OfferRow & { id: Id<'menuItems'> }>>
  balance: () => Promise<number>
  bookings: () => Promise<Array<{ date: string; service: Service; dishName: string; priceXof: number; status: string; cancellableUntil: number }>>
  day: (date: string) => Promise<Array<DayOffer>>
  points: (date: string) => Promise<Array<Point>>
}

/** Offre d'un jour de production, telle que la renvoie `production.day`. */
export type DayOffer = DayOfferFigures & { dishName: string; service: Service }

/** `data` est ce que lit le modèle (JSON compact) ; `card` est ce que voit la personne. */
export type Outcome = { card: Card | null; data: Record<string, unknown> }

export type Capability = {
  audience: Audience
  description: string
  input: z.ZodType
  call: (reader: Reader, raw: unknown) => Promise<Outcome>
}

/** Associe un schéma d'entrée à son exécution : l'entrée est toujours validée avant la lecture. */
export function capability<TSchema extends z.ZodType>(def: {
  audience: Audience
  description: string
  input: TSchema
  run: (reader: Reader, input: z.infer<TSchema>) => Promise<Outcome>
}): Capability {
  return { audience: def.audience, description: def.description, input: def.input, call: (reader, raw) => def.run(reader, def.input.parse(raw)) }
}

/** Jour demandé : mot relatif (le modèle ne calcule pas de date) ou date AAAA-MM-JJ. */
export const dayInput = z.string().max(10).describe('« today », « tomorrow » ou une date AAAA-MM-JJ')

export function resolveDay(reader: Reader, value: string): string {
  if (value === 'today') return reader.today
  if (value === 'tomorrow') return addDays(reader.today, 1)
  if (!isIsoDate(value)) throw new ConvexError('Date invalide : « today », « tomorrow » ou AAAA-MM-JJ.')
  return value
}

/** Heure lisible (Abidjan = UTC) : le modèle cite une heure fournie, il ne convertit rien. */
export const clock = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
