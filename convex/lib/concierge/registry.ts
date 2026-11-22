/**
 * Concierge : capacités autorisées par public (liste blanche). Un outil absent de cette liste n'existe pas
 * pour le modèle ; un raccourci (`quick.ts`) appelle la même capacité.
 */
import type { Audience, Capability } from './capability'
import * as kitchen from './kitchen'
import * as student from './student'

export const CAPABILITIES: Record<Audience, Record<string, Capability>> = {
  student: { menu: student.menu, balance: student.balance, bookings: student.bookings, plan: student.plan },
  kitchen: { day: kitchen.day, simulation: kitchen.simulation, points: kitchen.points },
}
