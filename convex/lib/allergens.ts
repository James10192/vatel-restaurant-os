import { v } from 'convex/values'
import type { Infer } from 'convex/values'

/**
 * Les 14 allergènes majeurs à déclaration obligatoire (liste de référence du règlement UE 1169/2011, annexe II),
 * retenue faute de liste ivoirienne publiée. Liste fermée : pas de texte libre, donc pas de faute de frappe qui
 * masquerait un allergène.
 */
export const allergenCodeValidator = v.union(
  v.literal('gluten'),
  v.literal('crustaceans'),
  v.literal('eggs'),
  v.literal('fish'),
  v.literal('peanuts'),
  v.literal('soy'),
  v.literal('milk'),
  v.literal('nuts'),
  v.literal('celery'),
  v.literal('mustard'),
  v.literal('sesame'),
  v.literal('sulphites'),
  v.literal('lupin'),
  v.literal('molluscs'),
)

export type AllergenCode = Infer<typeof allergenCodeValidator>

/** Libellés affichés, dans l'ordre de présentation. Un code absent de cette table ne compile pas. */
export const ALLERGEN_LABELS: Record<AllergenCode, string> = {
  gluten: 'Gluten',
  crustaceans: 'Crustacés',
  eggs: 'Œufs',
  fish: 'Poissons',
  peanuts: 'Arachides',
  soy: 'Soja',
  milk: 'Lait',
  nuts: 'Fruits à coque',
  celery: 'Céleri',
  mustard: 'Moutarde',
  sesame: 'Sésame',
  sulphites: 'Sulfites',
  lupin: 'Lupin',
  molluscs: 'Mollusques',
}

export const ALLERGEN_CODES = Object.keys(ALLERGEN_LABELS) as Array<AllergenCode>
