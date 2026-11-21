import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { EN } from './en'

/**
 * Langue de l'interface (FR par défaut, EN). Approche « gettext » : le texte français EST la clé
 * (`t('Mes repas')`), le dictionnaire anglais le traduit, et un texte sans traduction reste en français.
 * La langue vit dans un cookie lu par le serveur : le premier rendu SSR est déjà dans la bonne langue.
 */
export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const LOCALE_COOKIE = 'vatel-lang'
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
}
export const isLocale = (value: unknown): value is Locale =>
  LOCALES.some((locale) => locale === value)

type Vars = Record<string, string | number>

/** Traduit un texte français ; `{nom}` est remplacé par `vars.nom`. */
export function translate(locale: Locale, text: string, vars?: Vars): string {
  const message = locale === 'en' ? (EN[text] ?? text) : text
  return vars
    ? message.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in vars ? String(vars[key]) : match,
      )
    : message
}

export type Translate = (text: string, vars?: Vars) => string

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
}>({
  locale: 'fr',
  setLocale: () => {},
})

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale
  children: ReactNode
}) {
  const [locale, setState] = useState(initial)
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
    setState(next)
  }, [])
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)

export function useT(): Translate {
  const { locale } = useLocale()
  return useCallback(
    (text: string, vars?: Vars) => translate(locale, text, vars),
    [locale],
  )
}
