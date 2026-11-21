# B2 Smart Production : contrat d'intégration (préparation seule, aucun code)

Source : #5 (section du 21/11), #13, #16, #23. B2 ne démarre qu'après validation humaine du gate B1.

## Principes
- Calculs déterministes en TypeScript pur (`convex/lib/production/`), testés sans base ni LLM.
- Simulation en **lecture seule** : aucune réservation, solde, stock ni statut modifié.
- Chaque chiffre affiché est explicable : formule + données sources (offres, réservations, recettes).
- IA facultative, uniquement pour reformuler un résultat déjà calculé ; l'écran fonctionne sans IA.
- Toute action opérationnelle (« Ajuster le plan ») : rôle autorisé, confirmation UI, mutation dédiée
  qui revalide côté serveur, journal d'audit. Jamais déclenchée par le modèle.

## Formules (#5)
```
D  = réservations confirmées + déjà remises + passages estimés + marge approuvée
P  = portions préparées
R  = max(0, D - P)                         portions manquantes
D' = D - annulations simulées + arrivées simulées
R' = max(0, D' - P)
gaspillage évitable = max(0, R - R')       surplus potentiel = max(0, P - D')
besoin ingrédient i = Σ plats (D' / recette.portions) × quantité_i   (unité de la recette)
```
Cas de référence : demandé 150, préparé 50, 30 annulables → D' = 120, R' = 70 au lieu de 100, 30 évitables.

## Interfaces prévues
```ts
type ProductionScenario = {
  date: string
  service: 'lunch' | 'dinner'
  cancellations: Record<MenuItemId, number>   // simulées, entiers ≥ 0, ≤ réservées
  arrivals: Record<MenuItemId, number>        // simulées, entiers ≥ 0
}
type ProductionLine = {
  menuItemId: MenuItemId; dishName: string
  demand: number; prepared: number; missing: number
  simulatedDemand: number; simulatedMissing: number; avoidableWaste: number; surplus: number
  sources: { confirmed: number; pickedUp: number; walkIns: number; margin: number }
}
type IngredientNeed = { ingredientId; name; quantity: number; unit: string; status: 'computed' | 'recipe_missing' }
type ProductionPreview = { lines: ProductionLine[]; ingredients: IngredientNeed[]; warnings: string[] }
```
- `production.preview` : query (rôle admin ou chef, établissement du profil), args `ProductionScenario`,
  retour `ProductionPreview`, bornée à un jour/service, index existants `by_canteen_date_service`.
- Stock et coûts : « Stock non renseigné » / « Prix unitaire non vérifié » tant que #13 n'a pas ces données.
- `production.explain` (facultatif) : action qui envoie au LLM le `ProductionPreview` déjà calculé
  (aucune donnée personnelle) et renvoie un texte ; même repli et mêmes quotas que B1 (`aiUsage`).

## Tests attendus
Cas de référence 150/50/30 ; recette sans portions ; unité inconnue ; annulations > réservées refusées ;
isolation entre établissements ; usager refusé ; deux sessions temps réel ; 360 px ; IA coupée.
