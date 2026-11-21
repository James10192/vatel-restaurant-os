# B3 QR de retrait (#4) et lots IA du 21/11 soir

## QR de retrait (`convex/passes.ts`, `convex/lib/pass.ts`)
- L'usager ouvre « QR de retrait » (Mes repas, ou carte « Prochain repas » le jour même) : le serveur émet un code
  aléatoire de 12 caractères (60 bits, Crockford), n'en garde que l'empreinte SHA-256, valable jusqu'à la fin du jour
  du repas. Rouvrir émet un nouveau code et invalide l'ancien. Le code n'est jamais stocké sur l'appareil ni mis dans une URL.
- Comptoir (`admin` ou `distribution`) : « Scanner un QR » dans Commandes du jour (aujourd'hui seulement). Caméra arrière
  avec détecteur natif, sinon jsQR chargé à la demande (47 Ko gzip, hors des autres écrans) ; saisie manuelle si caméra
  refusée ou absente. Aperçu nom + repas, vérification d'identité par le personnel, puis « Remettre le repas ».
- Refus motivés : déjà remis (y compris remise manuelle), annulée, autre jour, expiré, inconnu ou remplacé, autre établissement
  (vu comme inconnu, sans fuite). « Marquer remis » reste la solution sans QR.
- Preuves : 8 tests serveur. Navigateur (backend local, données fictives) : vrai scan caméra (vidéo factice du QR affiché
  chez l'étudiante, décodé par jsQR), remise, l'étudiante voit « Repas remis » en direct, rejeu caméra refusé, saisie
  manuelle sur poste sans caméra en 360 px. Captures : `captures/`.

## Copilote cuisine (#9, `convex/copilot.ts`, `convex/lib/copilot/`)
- Bouton « Copilote » sur Production. Points d'attention calculés sans IA à partir des mêmes lectures que l'écran
  (`convex/lib/production/load.ts`), traduisibles FR/EN, triés à faire / à surveiller / information.
- IA facultative (modèle B1 en liste blanche, variables `SMART_MENU_*`) : ordonne au plus trois priorités et écrit un
  résumé. Rejet serveur si un nombre cité n'apparaît dans aucun point, si le texte rassure sur la santé ou dépasse 420
  caractères. Quotas mutualisés avec l'aide au choix (`convex/lib/aiQuota.ts`, 20 appels par membre et par jour).
- Preuves : 10 tests (modèle simulé : nominal, chiffre inventé, injection par nom de plat, panne ; serveur : droits, repli).
  Navigateur : chemin sans IA seulement (aucune clé fournisseur dans cette session). **Le résumé IA réel n'a pas été observé.**

## Réserver la proposition (#3, `bookings.bookMany`)
- « Réserver ces N repas » dans l'Aide au choix : une confirmation, jusqu'à 7 repas, tout ou rien dans une transaction,
  mêmes contrôles qu'une réservation seule (`convex/lib/booking.ts`), message qui nomme le jour bloquant, idempotence par lot.
- Propositions tenues à jour en direct (places, « Complet », « Réservé »).
- Preuves : 5 tests ; navigateur 390 px : un autre étudiant prend la dernière portion de mardi pendant l'affichage,
  la carte passe à « Complet », le bouton passe de 3 à 2 repas, réservation confirmée, solde 5 000 → 2 600 vérifié en base.

## Limites
- UI de scan et copilote visibles par l'admin seulement (garde `/admin`) ; le serveur accepte aussi `distribution` (scan) et `chef` (copilote).
- Pas de journal d'audit dédié des remises par QR au-delà de `usedAt` / `usedBy` sur le pass.
