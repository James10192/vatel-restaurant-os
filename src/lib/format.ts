const xof = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const dayShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** « 1 500 FCFA » */
export const formatXof = (amount: number) => `${xof.format(amount)} FCFA`

/** « lundi 23 novembre » */
export const formatDayLong = (iso: string) => dayLong.format(toDate(iso))

/** « 23 nov. » */
export const formatDayShort = (iso: string) => dayShort.format(toDate(iso))

/** Date du jour au format ISO, selon le fuseau de l'appareil. */
export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export const SERVICE_LABELS = { lunch: 'Déjeuner', dinner: 'Dîner' } as const
export type Service = keyof typeof SERVICE_LABELS
