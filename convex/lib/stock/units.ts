/**
 * Conversions d'unités (#6, #13) : seulement les équivalences universelles de masse et de volume.
 * Toute autre paire (pièce, botte, sac...) est « incompatible » : on le signale, on ne devine jamais.
 */
const FACTORS: Record<string, { dimension: 'mass' | 'volume'; toBase: number }> = {
  mg: { dimension: 'mass', toBase: 0.001 },
  g: { dimension: 'mass', toBase: 1 },
  kg: { dimension: 'mass', toBase: 1000 },
  ml: { dimension: 'volume', toBase: 1 },
  cl: { dimension: 'volume', toBase: 10 },
  l: { dimension: 'volume', toBase: 1000 },
}

const keyOf = (unit: string) => unit.trim().toLowerCase().replace(/\.$/, '')

/** `quantity` exprimée en `from`, convertie en `to` ; null si la conversion n'est pas définie. */
export function convert(quantity: number, from: string, to: string): number | null {
  if (keyOf(from) === keyOf(to)) return quantity
  const a = FACTORS[keyOf(from)] as (typeof FACTORS)[string] | undefined
  const b = FACTORS[keyOf(to)] as (typeof FACTORS)[string] | undefined
  if (!a || !b || a.dimension !== b.dimension) return null
  return (quantity * a.toBase) / b.toBase
}
