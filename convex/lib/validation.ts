import { ConvexError } from 'convex/values'
import { isIsoDate } from './dates'

/** Plafond de sécurité d'un prix unitaire en FCFA (entier). */
export const MAX_PRICE_XOF = 1_000_000
export const MAX_CAPACITY = 10_000

export function assertPriceXof(value: number): number {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_PRICE_XOF) {
    throw new ConvexError('Prix invalide : entier positif en FCFA attendu.')
  }
  return value
}

export function assertCapacity(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_CAPACITY) {
    throw new ConvexError('Quantité disponible invalide.')
  }
  return value
}

export function assertPositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new ConvexError(`${label} : valeur positive attendue.`)
  return value
}

/** Nom lisible nettoyé, et clé de dédoublonnage insensible à la casse et aux accents. */
/** Clé de comparaison : sans accents, sans casse, espaces réduits (« Pâte  d’Arachide » = « pate d’arachide »). */
export const toKey = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function cleanName(value: string, label: string): { name: string; key: string } {
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 80) throw new ConvexError(`${label} : 1 à 80 caractères.`)
  return { name, key: toKey(name) }
}

export function assertIsoDate(value: string): string {
  if (!isIsoDate(value)) throw new ConvexError('Date invalide.')
  return value
}

export const MAX_KEY_LENGTH = 100
export const MAX_TEXT_LENGTH = 500
export const MAX_LIST_LENGTH = 50

/** Clé d'idempotence générée par le client : non vide et bornée (évite un stockage arbitraire). */
export function assertIdempotencyKey(value: string): string {
  if (value.length === 0 || value.length > MAX_KEY_LENGTH) throw new ConvexError('Clé de requête invalide.')
  return value
}

/** Texte libre facultatif (description) : borné. */
export function assertText(value: string | undefined, label: string): string | undefined {
  if (value !== undefined && value.length > MAX_TEXT_LENGTH) {
    throw new ConvexError(`${label} : ${MAX_TEXT_LENGTH} caractères au maximum.`)
  }
  return value
}

/** Liste saisie (allergènes, lignes de recette) : bornée. */
export function assertListLength<T>(list: Array<T>, label: string): Array<T> {
  if (list.length > MAX_LIST_LENGTH) throw new ConvexError(`${label} : ${MAX_LIST_LENGTH} éléments au maximum.`)
  return list
}
