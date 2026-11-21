/**
 * Smart Menu (B1) : règles déterministes. Tout ce qui engage l'usager (éligibilité, prix, budget,
 * allergènes, un repas par jour) est calculé ici, jamais par le modèle de langage.
 */
import type { Infer } from 'convex/values'
import type { allergenInfoValidator } from '../../schema'

export type Service = 'lunch' | 'dinner'
export type ServiceWish = Service | 'any'
export type AllergenInfo = Infer<typeof allergenInfoValidator>

/** Offre publiée telle que lue en base pour l'établissement de l'usager. */
export type OfferRow = {
  id: string
  date: string
  service: Service
  dishName: string
  description?: string
  priceXof: number
  capacity: number
  remaining: number
  bookableUntil: number
  allergens: AllergenInfo
  /** L'usager a déjà un repas actif sur ce jour et ce service. */
  alreadyBooked: boolean
}

export type SmartRequest = { days: Array<string>; budgetXof: number; service: ServiceWish; avoid: Array<string> }

export type UncoveredReason = 'no_menu' | 'unavailable' | 'allergens' | 'budget'
export type Plan<TRow extends OfferRow = OfferRow> = {
  picks: Array<{ offer: TRow; reason?: string }>
  totalXof: number
  uncovered: Array<{ date: string; reason: UncoveredReason }>
}

export type Evaluation<TRow extends OfferRow = OfferRow> = {
  /** Offres réservables et compatibles, par jour. */
  eligibleByDay: Map<string, Array<TRow>>
  uncovered: Array<{ date: string; reason: Exclude<UncoveredReason, 'budget'> }>
  /** Plats écartés parce que leurs allergènes ne sont pas renseignés alors que l'usager en évite. */
  excludedUnknownAllergens: number
}

export const normalizeAllergen = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

/** Compatible seulement si les allergènes sont déclarés et n'en contiennent aucun évité (traces comprises). */
function allergenVerdict(allergens: AllergenInfo, avoid: Set<string>): 'ok' | 'conflict' | 'unknown' {
  if (avoid.size === 0) return 'ok'
  if (allergens.status === 'unknown') return 'unknown'
  const declared = [...allergens.present, ...allergens.traces].map(normalizeAllergen)
  return declared.some((name) => avoid.has(name)) ? 'conflict' : 'ok'
}

export function evaluate<TRow extends OfferRow>(rows: Array<TRow>, request: SmartRequest, now: number): Evaluation<TRow> {
  const avoid = new Set(request.avoid.map(normalizeAllergen))
  const eligibleByDay = new Map<string, Array<TRow>>()
  const uncovered: Evaluation<TRow>['uncovered'] = []
  let excludedUnknownAllergens = 0

  for (const date of request.days) {
    const ofDay = rows.filter((row) => row.date === date && (request.service === 'any' || row.service === request.service))
    const bookable = ofDay.filter((row) => row.remaining > 0 && now < row.bookableUntil && !row.alreadyBooked)
    const verdicts = bookable.map((row) => allergenVerdict(row.allergens, avoid))
    excludedUnknownAllergens += verdicts.filter((verdict) => verdict === 'unknown').length
    const eligible = bookable.filter((_, i) => verdicts[i] === 'ok')
    if (eligible.length > 0) eligibleByDay.set(date, eligible)
    else uncovered.push({ date, reason: ofDay.length === 0 ? 'no_menu' : bookable.length === 0 ? 'unavailable' : 'allergens' })
  }
  return { eligibleByDay, uncovered, excludedUnknownAllergens }
}

/**
 * Plan sans IA : au plus un repas par jour, le moins cher du jour, en couvrant le maximum de jours
 * dans le budget (jours les moins chers d'abord). Toujours disponible, y compris si l'IA est coupée.
 */
export function planByRules<TRow extends OfferRow>(evaluation: Evaluation<TRow>, request: SmartRequest): Plan<TRow> {
  const cheapest = [...evaluation.eligibleByDay.values()].map((offers) =>
    offers.reduce((best, offer) => (offer.priceXof < best.priceXof ? offer : best)),
  )
  cheapest.sort((a, b) => a.priceXof - b.priceXof || a.date.localeCompare(b.date))
  const picks: Plan<TRow>['picks'] = []
  const overBudget: Plan['uncovered'] = []
  let totalXof = 0
  for (const offer of cheapest) {
    if (totalXof + offer.priceXof <= request.budgetXof) {
      picks.push({ offer })
      totalXof += offer.priceXof
    } else overBudget.push({ date: offer.date, reason: 'budget' })
  }
  return finalize(picks, [...evaluation.uncovered, ...overBudget])
}

export type AiPick = { offerId: string; reason: string }

/** Une explication ne doit jamais rassurer sur les allergènes ni sur la santé (FOOD-01, #16). */
export const UNSAFE_CLAIM = /allerg|garanti|sans risque|sans danger|sûr pour|sur pour|sain|santé|sante|médical|medical|régime|regime|safe/i
const CONTROL_CHARS = /\p{Cc}/gu

export function sanitizeReason(reason: string): string | undefined {
  const clean = reason.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
  if (!clean || UNSAFE_CLAIM.test(clean)) return undefined
  return clean
}

export type AiValidation<TRow extends OfferRow = OfferRow> = { ok: true; plan: Plan<TRow> } | { ok: false; problem: string }

/**
 * Valide la proposition du modèle contre les données serveur. Le moindre écart (offre inconnue,
 * jour en double, budget dépassé) rejette toute la proposition : on repasse alors au plan sans IA.
 */
export function validateAiPicks<TRow extends OfferRow>(
  aiPicks: Array<AiPick>,
  evaluation: Evaluation<TRow>,
  request: SmartRequest,
): AiValidation<TRow> {
  // Seule source des prix et disponibilités : les offres éligibles lues en base.
  const eligible = new Map([...evaluation.eligibleByDay.values()].flat().map((offer) => [offer.id, offer]))
  const days = new Set<string>()
  const picks: Plan<TRow>['picks'] = []
  let totalXof = 0
  for (const pick of aiPicks) {
    const offer = eligible.get(pick.offerId)
    if (!offer) return { ok: false, problem: 'offre inconnue ou non réservable' }
    if (days.has(offer.date)) return { ok: false, problem: 'deux repas le même jour' }
    days.add(offer.date)
    totalXof += offer.priceXof
    picks.push({ offer, reason: sanitizeReason(pick.reason) })
  }
  if (totalXof > request.budgetXof) return { ok: false, problem: 'budget dépassé' }
  if (picks.length === 0 && evaluation.eligibleByDay.size > 0) return { ok: false, problem: 'aucun repas proposé' }
  const notPicked = [...evaluation.eligibleByDay.keys()].filter((date) => !days.has(date))
  return { ok: true, plan: finalize(picks, [...evaluation.uncovered, ...notPicked.map((date) => ({ date, reason: 'budget' as const }))]) }
}

function finalize<TRow extends OfferRow>(picks: Plan<TRow>['picks'], uncovered: Plan['uncovered']): Plan<TRow> {
  picks.sort((a, b) => a.offer.date.localeCompare(b.offer.date) || a.offer.service.localeCompare(b.offer.service))
  uncovered.sort((a, b) => a.date.localeCompare(b.date))
  return { picks, totalXof: picks.reduce((sum, pick) => sum + pick.offer.priceXof, 0), uncovered }
}
