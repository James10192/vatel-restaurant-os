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
export function cleanName(value: string, label: string): { name: string; key: string } {
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 80) throw new ConvexError(`${label} : 1 à 80 caractères.`)
  const key = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return { name, key }
}

export function assertIsoDate(value: string): string {
  if (!isIsoDate(value)) throw new ConvexError('Date invalide.')
  return value
}
