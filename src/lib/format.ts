import type { Locale } from '#/i18n/i18n'

const TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' }
const xof = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const dayLong = {
  fr: new Intl.DateTimeFormat(TAG.fr, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  en: new Intl.DateTimeFormat(TAG.en, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
}
const dayShort = {
  fr: new Intl.DateTimeFormat(TAG.fr, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  en: new Intl.DateTimeFormat(TAG.en, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** « 1 500 FCFA » (même écriture dans les deux langues, monnaie locale). */
export const formatXof = (amount: number) => `${xof.format(amount)} FCFA`

/** « lundi 23 novembre » */
export const formatDayLong = (iso: string, locale: Locale = 'fr') => dayLong[locale].format(toDate(iso))

/** « 23 nov. » */
export const formatDayShort = (iso: string, locale: Locale = 'fr') => dayShort[locale].format(toDate(iso))

/** Date du jour au format ISO, selon le fuseau de l'appareil. */
export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export const SERVICE_LABELS = { lunch: 'Déjeuner', dinner: 'Dîner' } as const
export type Service = keyof typeof SERVICE_LABELS

const formats = new Map<string, Intl.DateTimeFormat>()

/** Format de date mis en cache, dans la langue de l'interface (fuseau à préciser dans `options`). */
export function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}${JSON.stringify(options)}`
  let format = formats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(TAG[locale], options)
    formats.set(key, format)
  }
  return format
}
