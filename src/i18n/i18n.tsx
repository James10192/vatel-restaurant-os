import { createContext, useCallback, useContext, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { EN, EN_PATTERNS } from './en'

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

/** Entrée du dictionnaire, ou undefined (`Object.hasOwn` : jamais une clé héritée comme « constructor »). */
const lookup = (key: string): string | undefined =>
  Object.hasOwn(EN, key) ? EN[key] : undefined

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&')

/** Modèles compilés une fois : « {label} : 1 à 80 caractères. » → /^(.+?) : 1 à 80 caractères\.$/. */
const PATTERNS = Object.entries(EN_PATTERNS).map(([fr, en]) => {
  const names = [...fr.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
  const regex = new RegExp(
    `^${fr
      .split(/\{\w+\}/)
      .map(escape)
      .join('(.+?)')}$`,
  )
  return { regex, names, en }
})

/** Message serveur à valeur variable : modèle anglais rempli avec les valeurs capturées (traduites si connues). */
function fromPattern(text: string): string | undefined {
  for (const { regex, names, en } of PATTERNS) {
    const match = regex.exec(text)
    if (match)
      return en.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = match[names.indexOf(key) + 1]
        return lookup(value) ?? value
      })
  }
  return undefined
}

/** Traduit un texte français ; `{nom}` est remplacé par `vars.nom`. */
export function translate(locale: Locale, text: string, vars?: Vars): string {
  const message =
    locale === 'en' ? (lookup(text) ?? fromPattern(text) ?? text) : text
  return vars
    ? message.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in vars ? String(vars[key]) : match,
      )
    : message
}

export type Translate = (text: string, vars?: Vars) => string

/** Titre d'onglet du navigateur : « Page | Vatel Restauration », dans la langue de l'interface. */
export const pageTitle = (locale: Locale, page: string) =>
  `${translate(locale, page)} | ${translate(locale, 'Vatel Restauration')}`

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
  const router = useRouter()
  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      document.documentElement.lang = next
      setState(next)
      // Relit le cookie dans `__root` et recalcule les `head()` : le titre de l'onglet suit la langue.
      void router.invalidate()
    },
    [router],
  )
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
