/**
 * Concierge : raccourcis sans IA (aussi lus par l'interface, d'où ce module sans dépendance serveur).
 * Chacun appelle une capacité du registre avec une entrée fixe ; la phrase de réponse est traduite à l'affichage.
 */
/** Public de l'assistant : usager, ou gestion (administration et cuisine). */
export type Audience = 'student' | 'kitchen'

/** Rôle -> public ; null pour la distribution (elle a son écran de service) et un compte non rattaché. */
export const audienceOf = (role: string | undefined): Audience | null =>
  role === 'student' ? 'student' : role === 'admin' || role === 'chef' ? 'kitchen' : null

export const QUICK_ACTIONS = {
  menu_next: { audience: 'student', capability: 'menu', input: { from: 'today', days: 3 }, label: 'Menu des prochains jours', reply: 'Voici le menu des prochains jours.' },
  my_balance: { audience: 'student', capability: 'balance', input: {}, label: 'Mon solde', reply: 'Voici votre solde.' },
  my_bookings: { audience: 'student', capability: 'bookings', input: {}, label: 'Mes réservations', reply: 'Voici vos réservations à venir.' },
  today_figures: { audience: 'kitchen', capability: 'day', input: { date: 'today' }, label: 'Chiffres du jour', reply: 'Voici les chiffres réels du jour.' },
  tomorrow_figures: { audience: 'kitchen', capability: 'day', input: { date: 'tomorrow' }, label: 'Demain, combien ?', reply: 'Voici les chiffres de demain.' },
  attention: { audience: 'kitchen', capability: 'points', input: { date: 'today' }, label: 'Points d’attention', reply: 'Voici ce qui demande votre attention aujourd’hui.' },
} as const satisfies Record<string, { audience: Audience; capability: string; input: Record<string, unknown>; label: string; reply: string }>

export type QuickActionId = keyof typeof QUICK_ACTIONS
export const QUICK_ACTION_IDS = Object.keys(QUICK_ACTIONS) as Array<QuickActionId>
