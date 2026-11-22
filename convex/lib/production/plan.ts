/**
 * Smart Production (#5) : calcul déterministe du besoin de préparation et simulation d'un imprévu.
 * Fonctions pures, partagées serveur et interface, testées sans base ni LLM. Aucune mutation.
 *
 * D  = confirmées + remises + passages estimés + marge          (demande du service)
 * P  = portions préparées (saisies en cuisine, ou hypothèse signalée si inconnues)
 * R  = max(0, D - P)                                            (reste à préparer)
 * D' = D - annulations simulées + arrivées simulées ; R' = max(0, D' - P)
 * évitables = max(0, R - R') ; supplémentaires = max(0, R' - R) ; surplus = max(0, P - D')
 */

export const MAX_SIMULATED = 10_000

/** Situation réelle d'une offre, lue en base. `prepared` null = jamais saisi en cuisine. */
export type Baseline = { capacity: number; confirmed: number; pickedUp: number; prepared: number | null }
/** Hypothèses validées par le chef (valent avant ET après l'imprévu). */
export type Assumptions = { walkIns: number; margin: number; preparedAssumed: number }
/** Imprévu simulé (après seulement). */
export type Scenario = { cancellations: number; arrivals: number }

export type FieldIssue = { field: keyof Assumptions | keyof Scenario; message: string }

export type Snapshot = { demand: number; prepared: number; missing: number; surplus: number }
export type Recommendation = 'reduce' | 'increase' | 'hold' | 'stop'
export type Simulation = {
  before: Snapshot
  after: Snapshot
  avoidable: number
  extra: number
  capacityOverflow: number
  preparedKnown: boolean
  recommendation: Recommendation
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX_SIMULATED

/** Contrôle de saisie : entiers positifs, annulations limitées aux réservations encore annulables (non remises). */
export function validateInputs(baseline: Baseline, assumptions: Assumptions, scenario: Scenario): Array<FieldIssue> {
  const issues: Array<FieldIssue> = []
  const fields = { ...assumptions, ...scenario }
  for (const [field, value] of Object.entries(fields) as Array<[FieldIssue['field'], number]>) {
    if (!isCount(value)) issues.push({ field, message: 'Nombre entier positif attendu.' })
  }
  if (isCount(scenario.cancellations) && scenario.cancellations > baseline.confirmed) {
    issues.push({ field: 'cancellations', message: 'Au plus {n} réservations encore annulables.' })
  }
  return issues
}

const snapshot = (demand: number, prepared: number): Snapshot => ({
  demand,
  prepared,
  missing: Math.max(0, demand - prepared),
  surplus: Math.max(0, prepared - demand),
})

/** Demande du service : chaque réservation comptée une seule fois (confirmée OU remise), plus les hypothèses. */
export const demandOf = (baseline: Baseline, assumptions: Pick<Assumptions, 'walkIns' | 'margin'>) =>
  baseline.confirmed + baseline.pickedUp + assumptions.walkIns + assumptions.margin

type PlanAssumptions = Pick<Assumptions, 'walkIns' | 'margin'>
const NO_PLAN: PlanAssumptions = { walkIns: 0, margin: 0 }

/**
 * Situation réelle : réservations, plus les hypothèses du plan validé par le chef s'il existe.
 * Null si le préparé n'a jamais été saisi (inconnu, jamais zéro).
 */
export const situationOf = (baseline: Baseline, plan: PlanAssumptions | null = null): Snapshot | null =>
  baseline.prepared === null ? null : snapshot(demandOf(baseline, plan ?? NO_PLAN), baseline.prepared)

/** Avant / après un imprévu. Lève une erreur si la saisie n'a pas été validée (jamais d'écrêtage silencieux). */
export function simulate(baseline: Baseline, assumptions: Assumptions, scenario: Scenario): Simulation {
  if (validateInputs(baseline, assumptions, scenario).length > 0) throw new RangeError('Saisie de simulation invalide.')
  const prepared = baseline.prepared ?? assumptions.preparedAssumed
  const before = snapshot(demandOf(baseline, assumptions), prepared)
  const after = snapshot(before.demand - scenario.cancellations + scenario.arrivals, prepared)
  const avoidable = Math.max(0, before.missing - after.missing)
  const extra = Math.max(0, after.missing - before.missing)
  return {
    before,
    after,
    avoidable,
    extra,
    capacityOverflow: Math.max(0, after.demand - baseline.capacity),
    preparedKnown: baseline.prepared !== null,
    recommendation: recommend(after, avoidable, extra),
  }
}

function recommend(after: Snapshot, avoidable: number, extra: number): Recommendation {
  if (after.surplus > 0) return 'stop'
  if (extra > 0) return 'increase'
  if (avoidable > 0) return 'reduce'
  return 'hold'
}

/** Ligne de fiche technique résolue (noms lisibles). `quantity` = brut pour `portions` portions. */
export type RecipeLine = { ingredientId: string; name: string; unitId: string; unit: string; quantity: number; lossPct: number }
export type Recipe = { portions: number; lines: Array<RecipeLine> }
export type MaterialNeed = { ingredientId: string; name: string; unitId: string; unit: string; gross: number; net: number }

/**
 * Matière brute (sortie de stock) et nette (après perte de préparation) pour `portions` portions.
 * Null si la fiche est absente ou inexploitable : le besoin est alors inconnu, jamais nul.
 */
export function materialsFor(recipe: Recipe | null, portions: number): Array<MaterialNeed> | null {
  if (!recipe || !Number.isInteger(recipe.portions) || recipe.portions < 1 || recipe.lines.length === 0) return null
  if (recipe.lines.some((l) => !(l.quantity > 0) || !(l.lossPct >= 0 && l.lossPct < 100))) return null
  return recipe.lines.map((line) => {
    const gross = (line.quantity / recipe.portions) * portions
    return { ...pick(line), gross, net: gross * (1 - line.lossPct / 100) }
  })
}

const pick = ({ ingredientId, name, unitId, unit }: RecipeLine) => ({ ingredientId, name, unitId, unit })

/** Additionne des besoins par ingrédient ET unité (jamais de conversion implicite entre unités). */
export function sumMaterials(lists: Array<Array<MaterialNeed>>): Array<MaterialNeed> {
  const total = new Map<string, MaterialNeed>()
  for (const need of lists.flat()) {
    const key = `${need.ingredientId}:${need.unitId}`
    const prev = total.get(key)
    total.set(key, prev ? { ...prev, gross: prev.gross + need.gross, net: prev.net + need.net } : { ...need })
  }
  return [...total.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Affichage seulement : 2 décimales au plus (l'arrondi n'intervient jamais dans les calculs). */
export const roundQty = (value: number) => Math.round(value * 100) / 100

/** Demande d'une offre : réservations actives plus les hypothèses du plan validé, s'il existe. */
export const plannedDemand = (baseline: Baseline, plan: PlanAssumptions | null) => demandOf(baseline, plan ?? NO_PLAN)

/**
 * Portions encore à produire pour une offre : aujourd'hui, la demande moins le déjà préparé ; un jour à venir,
 * toute la demande (rien ne peut y être saisi) ; un jour passé, rien. Base de la matière à prévoir et des achats.
 */
export function toProduce(baseline: Baseline, plan: PlanAssumptions | null, date: string, today: string): number {
  if (date < today) return 0
  return Math.max(0, plannedDemand(baseline, plan) - (date === today ? (baseline.prepared ?? 0) : 0))
}

/** Offre d'un jour telle que lue par `production.day` (champs utiles aux totaux). */
export type DayOfferFigures = Baseline & { noShow: number; plan: PlanAssumptions | null }

/**
 * Totaux d'un jour, une seule définition pour l'écran et l'assistant : réservées = confirmées + remises ;
 * préparé connu seulement si chaque offre a été saisie (jamais un zéro supposé) ; demande selon le plan validé.
 */
export function dayTotals(offers: Array<DayOfferFigures>) {
  const sum = (value: (o: DayOfferFigures) => number) => offers.reduce((total, o) => total + value(o), 0)
  return {
    capacity: sum((o) => o.capacity),
    booked: sum((o) => o.confirmed + o.pickedUp),
    confirmed: sum((o) => o.confirmed),
    pickedUp: sum((o) => o.pickedUp),
    noShow: sum((o) => o.noShow),
    prepared: offers.every((o) => o.prepared !== null) ? sum((o) => o.prepared ?? 0) : null,
    demand: sum((o) => plannedDemand(o, o.plan)),
    walkIns: sum((o) => o.plan?.walkIns ?? 0),
    margin: sum((o) => o.plan?.margin ?? 0),
  }
}

type DayOffers = { date: string; offers: Array<Baseline & { plan: PlanAssumptions | null; recipe: Recipe | null; dishName: string }> }

/**
 * Matière brute encore nécessaire sur des jours de production (aujourd'hui : demande moins préparé ; à venir :
 * toute la demande) et plats sans fiche exploitable. Même calcul pour l'onglet Semaine et pour les achats.
 */
export function remainingMaterials(days: Array<DayOffers>, today: string) {
  const remaining = days.flatMap((day) => day.offers.map((o) => ({ o, portions: toProduce(o, o.plan, day.date, today) }))).filter((x) => x.portions > 0)
  const needs = remaining.map(({ o, portions }) => materialsFor(o.recipe, portions))
  return {
    materials: sumMaterials(needs.filter((n): n is Array<MaterialNeed> => n !== null)),
    withoutRecipe: [...new Set(remaining.filter((_, i) => needs[i] === null).map(({ o }) => o.dishName))],
  }
}
