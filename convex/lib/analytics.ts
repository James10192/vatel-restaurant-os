import { csvRows } from './csv'

/**
 * Indicateurs (#9) : calcul pur sur des lectures bornées (une période de 7 ou 30 jours d'un établissement).
 * Chaque taux donne son numérateur et son dénominateur ; les taux de retrait et d'absence ne portent que sur
 * les services terminés (jours passés), jamais sur des réservations encore à servir.
 */

export type DayInput = {
  date: string
  offers: Array<{ capacity: number; active: number; target: number | null; served: number }>
  bookings: Array<{ status: 'confirmed' | 'picked_up' | 'cancelled'; priceXof: number }>
  events: Array<{ kind: 'prepared' | 'waste' | 'recovered' | 'walkin'; portions: number }>
  scores: Array<number>
}

export type Rate = { value: number | null; numerator: number; denominator: number }
const rate = (numerator: number, denominator: number): Rate => ({ value: denominator > 0 ? Math.round((numerator / denominator) * 100) : null, numerator, denominator })

export type DayRow = ReturnType<typeof dayRow>

export function dayRow(day: DayInput, today: string) {
  const count = (status: DayInput['bookings'][number]['status']) => day.bookings.filter((b) => b.status === status).length
  const sum = (kind: DayInput['events'][number]['kind']) => day.events.filter((e) => e.kind === kind).reduce((n, e) => n + e.portions, 0)
  const past = day.date < today
  const planned = day.offers.filter((o) => o.target !== null)
  return {
    date: day.date,
    past,
    offers: day.offers.length,
    capacity: day.offers.reduce((n, o) => n + o.capacity, 0),
    booked: count('confirmed') + count('picked_up'),
    pickedUp: count('picked_up'),
    noShow: past ? count('confirmed') : 0,
    cancelled: count('cancelled'),
    walkIns: sum('walkin'),
    prepared: day.events.some((e) => e.kind === 'prepared') ? sum('prepared') : null,
    wasted: sum('waste'),
    recovered: sum('recovered'),
    /** Crédits de démonstration engagés (réservations non annulées) : jamais un chiffre d'affaires réel. */
    demoCreditsXof: day.bookings.filter((b) => b.status !== 'cancelled').reduce((n, b) => n + b.priceXof, 0),
    soldOut: day.offers.filter((o) => o.capacity > 0 && o.active >= o.capacity).length,
    ratingSum: day.scores.reduce((n, s) => n + s, 0),
    ratingCount: day.scores.length,
    /** Écart absolu entre passages estimés au plan et servis sans réservation, services passés planifiés. */
    planError: past ? planned.reduce((n, o) => n + Math.abs((o.target ?? 0) - o.served), 0) : 0,
    plannedOffers: past ? planned.length : 0,
  }
}

export function totals(rows: Array<DayRow>) {
  const done = rows.filter((r) => r.past)
  const s = (list: Array<DayRow>, key: 'booked' | 'pickedUp' | 'noShow' | 'cancelled' | 'walkIns' | 'wasted' | 'recovered' | 'demoCreditsXof' | 'soldOut' | 'ratingSum' | 'ratingCount' | 'planError' | 'plannedOffers' | 'offers') =>
    list.reduce((n, r) => n + r[key], 0)
  const measured = rows.filter((r) => r.prepared !== null)
  const prepared = measured.reduce((n, r) => n + (r.prepared ?? 0), 0)
  return {
    booked: s(rows, 'booked'),
    walkIns: s(rows, 'walkIns'),
    demoCreditsXof: s(rows, 'demoCreditsXof'),
    soldOut: s(rows, 'soldOut'),
    offers: s(rows, 'offers'),
    pickupRate: rate(s(done, 'pickedUp'), s(done, 'booked')),
    noShowRate: rate(s(done, 'noShow'), s(done, 'booked')),
    cancelRate: rate(s(rows, 'cancelled'), s(rows, 'booked') + s(rows, 'cancelled')),
    wasteRate: rate(s(measured, 'wasted'), prepared),
    recoveredRate: rate(s(measured, 'recovered'), prepared),
    /** Note moyenne sur 5, au dixième ; null sans note. */
    rating: { value: s(rows, 'ratingCount') ? Math.round((s(rows, 'ratingSum') / s(rows, 'ratingCount')) * 10) / 10 : null, count: s(rows, 'ratingCount') },
    /** Erreur moyenne du plan (portions par service planifié et terminé) ; null sans plan passé. */
    planError: { value: s(done, 'plannedOffers') ? Math.round((s(done, 'planError') / s(done, 'plannedOffers')) * 10) / 10 : null, services: s(done, 'plannedOffers') },
  }
}

/** Export tableur d'une période : une ligne par jour, séparateur « ; ». */
export function analyticsCsv(rows: Array<DayRow>) {
  const head = ['Date', 'Offres', 'Capacité', 'Réservés', 'Remis', 'Absents', 'Annulés', 'Sans réservation', 'Préparé', 'Perdu', 'Récupéré', 'Crédits démo (FCFA)', 'Plats complets', 'Notes', 'Note moyenne']
  const lines = rows.map((r) => [r.date, r.offers, r.capacity, r.booked, r.pickedUp, r.noShow, r.cancelled, r.walkIns, r.prepared ?? '', r.wasted, r.recovered, r.demoCreditsXof, r.soldOut, r.ratingCount, r.ratingCount ? (r.ratingSum / r.ratingCount).toFixed(1) : ''])
  return csvRows([head, ...lines])
}
