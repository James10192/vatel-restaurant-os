import { useEffect, useState } from 'react'

export type GreetingMoment = 'morning' | 'afternoon' | 'evening' | 'night'
/** `salutation` : formule seule (traduisible) ; `title` : formule + prénom (français). */
export type Greeting = { moment: GreetingMoment; salutation: string; title: string; subtitle: string | null }

const LAST_VISIT_KEY = 'vatel-last-visit'
const DAY_MS = 86_400_000

/** Moment de la journée selon l'heure locale de l'appareil. */
export function momentOf(hour: number): GreetingMoment {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

const HELLO: Record<GreetingMoment, string> = {
  morning: 'Bonjour',
  afternoon: 'Bon après-midi',
  evening: 'Bonsoir',
  night: 'Bonsoir',
}

/**
 * Salutation : moment de la journée + ancienneté de la dernière visite sur cet appareil.
 * Pure et testable ; `lastVisit` vaut null à la toute première visite.
 */
export function buildGreeting(firstName: string, now: Date, lastVisit: number | null): Greeting {
  const moment = momentOf(now.getHours())
  const name = firstName ? ` ${firstName}` : ''
  if (lastVisit === null) return { moment, salutation: 'Bienvenue', title: `Bienvenue${name}`, subtitle: 'Ravi de vous accueillir.' }
  const away = now.getTime() - lastVisit
  if (away >= 7 * DAY_MS)
    return { moment, salutation: 'Bon retour', title: `Bon retour${name}`, subtitle: 'Cela faisait un moment, voici la carte.' }
  if (away >= 2 * DAY_MS) return { moment, salutation: 'Bon retour', title: `Bon retour${name}`, subtitle: null }
  if (moment === 'night') return { moment, salutation: HELLO.night, title: `${HELLO.night}${name}`, subtitle: 'Il se fait tard.' }
  return { moment, salutation: HELLO[moment], title: `${HELLO[moment]}${name}`, subtitle: null }
}

function readLastVisit(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_VISIT_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Calculée après montage (heure et stockage de l'appareil) ; neutre au rendu serveur. */
export function useGreeting(firstName: string): Greeting {
  const [greeting, setGreeting] = useState<Greeting>({ moment: 'morning', salutation: 'Bonjour', title: `Bonjour ${firstName}`.trim(), subtitle: null })
  useEffect(() => {
    setGreeting(buildGreeting(firstName, new Date(), readLastVisit()))
    try {
      localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
    } catch {
      // Stockage indisponible : salutation selon l'heure seulement.
    }
  }, [firstName])
  return greeting
}
