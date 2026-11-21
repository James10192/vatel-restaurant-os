/** Dates civiles au format ISO « AAAA-MM-JJ », calculées en UTC pour éviter les décalages de fuseau. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
/** Bornes raisonnables : refuse les années aberrantes (ex. 0000, 9999). */
const MIN_YEAR = 2000
const MAX_YEAR = 2100

/** Vraie date du calendrier (refuse 2026-02-31, 2026-13-01, espaces, heures, formats partiels). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  if (year < MIN_YEAR || year > MAX_YEAR) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Lundi de la semaine contenant la date donnée. */
export function weekStartOf(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  return addDays(isoDate, -((day + 6) % 7))
}

export function weekDays(weekStart: string, count = 7): Array<string> {
  return Array.from({ length: count }, (_, i) => addDays(weekStart, i))
}
