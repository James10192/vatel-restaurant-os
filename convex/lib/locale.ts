import { v } from 'convex/values'
import type { Infer } from 'convex/values'

/** Langue de l'interface (FR par défaut), transmise par le client pour les textes générés côté serveur. */
export const localeValidator = v.union(v.literal('fr'), v.literal('en'))
export type Locale = Infer<typeof localeValidator>
