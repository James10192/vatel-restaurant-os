/** Dates civiles au format ISO « AAAA-MM-JJ », calculées en UTC pour éviter les décalages de fuseau. */

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
