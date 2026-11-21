/**
 * Créneaux de retrait (#4) : le service est découpé en créneaux de N minutes, chacun limité par la capacité
 * de distribution (repas remis par créneau, tous plats confondus). Calcul pur, partagé serveur et interface.
 */

export type SlotPolicy = { startHHMM: string; durationMinutes: number; slotMinutes: number; slotCapacity: number }

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Créneaux du service, dans l'ordre (« 12:00 », « 12:15 »...). */
export function slotsOf(policy: SlotPolicy): Array<string> {
  const start = toMinutes(policy.startHHMM)
  const count = Math.floor(policy.durationMinutes / policy.slotMinutes)
  return Array.from({ length: count }, (_, i) => toHHMM(start + i * policy.slotMinutes))
}

/**
 * Créneau attribué : celui demandé s'il reste de la place, sinon le premier qui en a. Null si tous sont pleins
 * (la réservation est alors refusée : pas de débordement promis).
 */
export function assignSlot(policy: SlotPolicy, taken: Record<string, number>, wanted?: string): string | null {
  const slots = slotsOf(policy)
  const free = (slot: string) => (taken[slot] ?? 0) < policy.slotCapacity
  if (wanted && slots.includes(wanted) && free(wanted)) return wanted
  return slots.find(free) ?? null
}

/** Fin du créneau (ms), pour signaler un retard au comptoir sans jamais refuser le repas. */
export const slotEndsAt = (date: string, slot: string, slotMinutes: number) => Date.parse(`${date}T${slot}:00Z`) + slotMinutes * 60_000
