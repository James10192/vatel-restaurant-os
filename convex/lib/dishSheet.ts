type SheetFields = {
  name: string
  description?: string
  defaultPriceXof: number
  allergens: { status: 'unknown' } | { status: 'declared' }
  recipe: { lines: ReadonlyArray<unknown> }
}

/**
 * Fiche publiée mais jamais remplie : allergènes « non renseignés » et aucune ligne de recette. La compléter n'enlève
 * rien de ce que les usagers ont vu, cela ajoute l'information qui manquait. C'est la seule modification permise
 * d'un plat publié (avec la photo).
 */
export const isEmptyUnknownSheet = (dish: SheetFields) => dish.allergens.status === 'unknown' && dish.recipe.lines.length === 0

/** Compléter une fiche vide garde l'identité vue par les usagers : nom, description et prix inchangés. */
export const keepsPublishedIdentity = (before: SheetFields, after: SheetFields) =>
  before.name === after.name && (before.description ?? '') === (after.description ?? '') && before.defaultPriceXof === after.defaultPriceXof
