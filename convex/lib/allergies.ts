import { ConvexError, v } from 'convex/values'
import type { Infer } from 'convex/values'
import { ALLERGEN_CODES, ALLERGEN_LABELS, allergenCodeValidator } from './allergens'
import type { AllergenCode } from './allergens'
import type { allergenInfoValidator } from '../schema'
import { toKey } from './validation'

/**
 * Allergies et intolérances d'une personne, ou allergènes d'un ingrédient : les 14 allergènes majeurs (liste fermée,
 * sans faute de frappe possible) plus des mentions libres pour ce que la liste ne couvre pas (mangue, kiwi, piment…).
 */
export const allergyListValidator = v.object({
  codes: v.array(allergenCodeValidator),
  others: v.array(v.string()),
})
export type AllergyList = Infer<typeof allergyListValidator>

export const allergyAlertValidator = v.object({
  /** Allergies de la personne retrouvées dans le plat (libellé majeur ou mention libre). */
  matches: v.array(v.string()),
  /** Allergènes du plat non renseignés : impossible de garantir l'absence (échec fermé). */
  unknown: v.boolean(),
})

export type AllergyAlertInfo = Infer<typeof allergyAlertValidator>

const MAX_OTHERS = 12

/** Une mention libre qui nomme un allergène majeur est rangée sous son code (« arachide » devient Arachides). */
function majorOf(text: string): AllergenCode | undefined {
  const key = toKey(text)
  return ALLERGEN_CODES.find((code) => {
    const label = toKey(ALLERGEN_LABELS[code])
    return label === key || label === `${key}s` || `${label}s` === key
  })
}

/** Nettoie une saisie : doublons retirés, mentions libres bornées (12 au plus, 2 à 40 caractères). */
export function cleanAllergyList({ codes, others }: AllergyList): AllergyList {
  const majors = new Set(codes)
  const seen = new Set<string>()
  const free: Array<string> = []
  for (const raw of others) {
    const text = raw.trim().replace(/\s+/g, ' ')
    if (text.length < 2 || text.length > 40) throw new ConvexError('Chaque allergie libre : 2 à 40 caractères.')
    const code = majorOf(text)
    if (code) majors.add(code)
    else if (!seen.has(toKey(text))) {
      seen.add(toKey(text))
      free.push(text)
    }
  }
  if (free.length > MAX_OTHERS) throw new ConvexError('12 allergies libres au plus.')
  return { codes: ALLERGEN_CODES.filter((code) => majors.has(code)), others: free }
}

const overlaps = (a: string, b: string) => a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a))

/**
 * Alerte d'un plat pour une personne. Rien si elle n'a rien déclaré. Comparaison sans accents ni casse, dans les deux
 * sens (« poisson » retrouve « Poissons ») : un faux positif vaut mieux qu'une allergie manquée.
 * Les mentions libres sont aussi cherchées dans les noms des ingrédients de la fiche.
 */
export function allergyAlert(
  allergies: AllergyList | undefined,
  dish: Infer<typeof allergenInfoValidator>,
  ingredientNames: Array<string>,
): AllergyAlertInfo | undefined {
  if (!allergies || allergies.codes.length + allergies.others.length === 0) return undefined
  if (dish.status === 'unknown') return { matches: [], unknown: true }
  const declared = [...dish.present, ...dish.traces].map(toKey)
  const names = ingredientNames.map(toKey)
  const matches = [
    ...allergies.codes.map((code) => ALLERGEN_LABELS[code]).filter((label) => declared.some((d) => overlaps(d, toKey(label)))),
    ...allergies.others.filter((other) => [...declared, ...names].some((d) => overlaps(d, toKey(other)))),
  ]
  return { matches, unknown: false }
}
