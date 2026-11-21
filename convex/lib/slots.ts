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

/** Premier créneau qui a encore de la place, ou null si tous sont pleins (pas de débordement promis). */
export function assignSlot(policy: SlotPolicy, taken: Record<string, number>): string | null {
  return slotsOf(policy).find((slot) => (taken[slot] ?? 0) < policy.slotCapacity) ?? null
}

/** Réservations actives par créneau (les réservations sans créneau ne comptent dans aucun). */
export function countBySlot(bookings: Array<{ slot?: string }>): Record<string, number> {
  const taken: Record<string, number> = {}
  for (const b of bookings) if (b.slot) taken[b.slot] = (taken[b.slot] ?? 0) + 1
  return taken
}

/** Un créneau précis peut-il recevoir une réservation ? Motif de refus, ou null. */
export function slotRefusal(policy: SlotPolicy, taken: Record<string, number>, slot: string): string | null {
  if (!slotsOf(policy).includes(slot)) return 'Créneau inconnu.'
  if ((taken[slot] ?? 0) >= policy.slotCapacity) return 'Ce créneau est complet.'
  return null
}
