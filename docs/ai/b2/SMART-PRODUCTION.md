# B2 Smart Production (#5) et Smart Waste (#6) : livré

Écran unique `/admin/production` (11e route, onglets « Préparer » et « Pertes réelles », filtres date/service dans l'URL).

## Smart Production (prévisionnel, lecture seule)
- Par plat : reste à préparer, piste demande (remis, à servir) au-dessus de la piste préparé, écart hachuré, trait de capacité.
- Encadré du service : total à préparer et **matière à sortir** (fiches techniques, brut et net après perte).
- « Simuler un imprévu » (Sheet) : absents/annulations (bornés aux réservations non remises), arrivées, passages
  sans réservation, marge, préparé supposé si inconnu. Avant/Après, recommandation déterministe
  (réduire / augmenter / maintenir / suspendre), dépassement de capacité, matière théorique non engagée.
  Limites affichées : stock non renseigné, coût non calculé, économie théorique.
- Calcul pur partagé `convex/lib/production/plan.ts` (aucun LLM, aucune écriture). Les chiffres de départ sont figés
  à l'ouverture ; si une réservation change, alerte « Les réservations ont changé » + « Recalculer », saisie conservée.

## Smart Waste (réel, mesuré)
- Journal en ajout seul `productionEvents` : portions préparées (correction = ligne négative) et pertes avec motif
  (surplus non servi, réservé non retiré, incident en cuisine, retrait qualité ou hygiène).
- Garde-fous serveur : rôle admin ou chef (`requireKitchen`), tenant du profil, offre publiée, jour déjà commencé,
  entiers 1 à 1000, perte ≤ préparé − remis − déjà perdu, correction jamais sous les pertes, idempotence par clé.
- Bilan par plat : préparé, remis, perdu, encore à servir, sans explication, taux ; matière perdue estimée ;
  gaspillage mesuré sur 7 jours (barres relatives au pire jour).

## Preuves (backend Convex local anonyme, données fictives)
- Tests : 155 (16 nouveaux : 150/50/30 → R' 70, 30 évitables, riz 2,4 kg, poulet 4,8 kg brut ; 140 préparées → 10 évitables,
  20 surplus, « suspendre » ; hausse 20 capacité 160 → dépassement 10 ; saisies invalides ; droits usager/distribution/autre
  établissement ; idempotence ; jour à venir refusé ; annulation réelle visible sans écriture de production).
- Navigateur 1280 et 360 px sans défilement horizontal, console sans erreur ; deux sessions : remise par CLI pendant
  une simulation ouverte → alerte, saisie gardée, borne 140 → 139 après « Recalculer ». Captures : `captures/`.

## Limites
- UI réservée à l'admin (la garde de route `/admin` reste admin) ; le serveur accepte aussi le rôle chef.
- Pas de stock, prix ingrédient ni conversion d'unités : affichés comme inconnus, jamais à zéro.
- Hypothèses (passages, marge) non persistées ; pas de « Ajuster le plan » ni d'IA explicative.
- Pas de correction d'une perte déclarée (journal en ajout seul ; à prévoir : ligne d'annulation tracée).
