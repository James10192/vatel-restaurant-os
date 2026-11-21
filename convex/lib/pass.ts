/**
 * Pass de retrait (#4 B3, #16 SEC-08) : code opaque aléatoire, sans donnée personnelle ni identifiant prévisible.
 * Le serveur n'en garde que l'empreinte SHA-256 ; le code en clair n'existe que dans le QR de l'usager.
 * 12 caractères Crockford base32 = 60 bits : impossible à deviner pendant sa journée de validité,
 * et chaque essai exige un compte du personnel. Lisible et saisissable à la main si la caméra manque.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 12

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join('')
}

/** Saisie tolérante : casse, espaces et tirets ignorés ; O lu 0, I et L lus 1 (Crockford). Null si invalide. */
export function normalizeCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null
}

/** « ABCD-EFGH-JKMN » : groupes de 4 pour la lecture à voix haute. */
export const formatCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Fin de validité : dernier instant du jour du repas (heure d'Abidjan = UTC). */
export const endOfDay = (isoDate: string) => Date.parse(`${isoDate}T23:59:59.999Z`)

/** Verdict d'un code présenté au comptoir ; tout sauf « ready » est un refus avec motif. */
export const PASS_VERDICTS = ['ready', 'invalid', 'unknown', 'used', 'cancelled', 'expired', 'wrong_day'] as const
export type PassVerdict = (typeof PASS_VERDICTS)[number]

export const PASS_REFUSALS: Record<Exclude<PassVerdict, 'ready'>, string> = {
  invalid: 'Code illisible : 12 caractères attendus.',
  unknown: 'QR inconnu ou remplacé par un plus récent.',
  used: 'Repas déjà remis.',
  cancelled: 'Réservation annulée : remise impossible.',
  expired: 'QR expiré.',
  wrong_day: 'Ce QR est valable un autre jour.',
}
