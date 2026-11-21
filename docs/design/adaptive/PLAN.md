# Refonte adaptative : audit et plan

Branche `feat/adaptive-layouts` (worktree `vatel-adaptive`), base `main` 8c18e7a. Captures AVANT : `avant/`
(375, 834, 1440 px, pleine page, comptes de test sur le déploiement dev). Ce document précède tout changement de code.

## 1. Audit des compositions existantes

| Écran | Mobile 375 | Tablette 834 | Desktop 1440 |
|---|---|---|---|
| Accueil étudiant | Bon : solde, jours en pastilles, cartes verticales. | **Mobile agrandi** : colonne de 640 px, carte repas pleine largeur, moitié basse vide. | **Mobile centré** : colonne 640 px au milieu de 1440, ~55 % de largeur vide, une carte repas de 640 px avec un visuel géant, aucune info secondaire (réservations à venir). |
| Mes repas | Cartes correctes. | Même colonne étroite. | **Deux cartes de 640 px** sur une page vide ; pas de filtres, pas de tri, pas de colonnes. |
| Solde | Bon. | Même colonne. | **Trois cartes empilées de 640 px** ; boutons de montant et bouton « Recharger » pleine largeur ; historique sans colonnes. |
| Vue d'ensemble (admin) | Bon depuis #26. | Correct, mais sidebar 256 px pleine. | Bonne hiérarchie ; liste par plat encore « carte » plutôt que tableau dense. |
| Menus (admin) | Long : 7 jours × 2 services empilés. | Sidebar pleine (256 px) qui mange l'espace ; 7 grandes cartes jour. | **Sept cartes jour empilées** de 1 100 px de large, chacune pour 0 ou 1 plat : on fait défiler 1 500 px pour voir une semaine. Aucune vue semaine en grille. |
| Commandes du jour | Liste correcte, filtres déjà en ligne (pas de Sheet). | Filtres serrés (« Tous Déjeuner Dîner » se touchent). | **Liste de type mobile** sur 1 100 px, sans colonnes, sans compteur par statut ; zone vide sous 2 lignes. |
| Connexion | Immersif, bon. | Photo pleine hauteur puis formulaire seul : pas de composition propre à la tablette. | Split 50/50 correct ; proportions à affiner sur 1920 et plus. |

Constats transversaux :
- **Shell étudiant** : barre du haut centrée sur ordinateur (contenu bloqué à `max-w-2xl`), barre du bas sur mobile, et rien pour la tablette.
- **Shell admin** : sidebar offcanvas pleine largeur dès 768 px, mais aucun rail compact.
- Aucune container query, aucune grille `auto-fill`. Les largeurs sont figées par `max-w-*` et non par le contenu.

## 2. Principes du système adaptatif

1. **Trois shells, un seul produit** : mobile (< 768) avec la barre du bas, tablette (768 à 1279) avec un rail d'icônes de 72 px, desktop (≥ 1280) avec une sidebar de 248 px.
   - Rendu 100 % CSS, sans aucune lecture de `window.innerWidth`, donc pas de risque d'hydratation.
   - Le rail et la sidebar sont deux variantes du même composant de navigation, réutilisant `useNavItems`.
2. **Zone de travail plafonnée par usage, pas par une colonne mobile** : desktop jusqu'à 1600 px, puis marges latérales sur ultrawide. Les grilles s'étendent en colonnes ; les cartes ne grandissent pas.
3. **Container queries** (`@container`, natif dans Tailwind 4) pour les composants métier : carte repas, ligne de commande, cellule de planning. Ils s'adaptent à leur colonne, pas à l'écran.
4. **Grilles `repeat(auto-fill, minmax(…))`** pour les catalogues : les cartes repas restent entre 260 et 340 px.
5. **Liste et détail** dès que la largeur le permet (tablette paysage et desktop) ; Sheet ou page sur mobile.
6. **Tableaux denses sur desktop** pour Mes repas, l'historique du solde et les commandes du jour ; cartes sur mobile. Même source de données, deux présentations.
7. Aucune donnée inventée : uniquement les champs déjà renvoyés par Convex. Aucun changement de schéma, d'auth, de ledger ou de mutation.

## 3. Matrice Mobile / Tablette / Desktop

| Écran | Mobile | Tablette | Desktop |
|---|---|---|---|
| Shell étudiant | Barre du bas, logo dans la page | Rail gauche (Accueil, Repas, Solde, Profil) | Sidebar : navigation, mini-solde, profil et thème en pied |
| Accueil | Inchangé (solde compact, prochain repas, jours, cartes) | Bandeau solde + prochain repas côte à côte ; repas en grille 2 colonnes | **Catalogue** : jours en onglets, grille `auto-fill` de cartes maîtrisées ; **panneau droit fixe de 340 px** : solde, prochain repas, réservations à venir |
| Mes repas | Cartes groupées « À venir / Passés » | Liste enrichie + détail du repas sélectionné à droite | **Tableau** (date, service, plat, prix, statut, action Annuler) avec onglets de statut |
| Solde | Inchangé | Deux zones : solde et recharge à gauche, historique à droite | **Espace financier** : colonne gauche de 360 px (solde, recharge en ligne) et historique en tableau (date, libellé, montant, solde après) |
| Menus admin | Jours en pastilles, un jour à la fois, ajout par Sheet | Liste des 7 jours à gauche (compteurs, brouillons), détail du jour à droite | **Planning hebdomadaire** : 7 colonnes × 2 lignes (Déjeuner, Dîner), plats en chips, « + » dans chaque cellule, barre de publication en en-tête |
| Commandes du jour | Liste priorisée (À servir d'abord), gros bouton « Marquer remis », filtres en Sheet | Filtres visibles, lignes tactiles larges, compteurs par statut | **Tableau opérationnel** (nom, plat, service, heure, statut, action rapide), compteurs-onglets, filtres en barre, « Charger plus » |
| Vue d'ensemble | Inchangé (#26) | Indicateurs sur 4 colonnes, services côte à côte | **Cockpit** : carte de service et file « à servir maintenant » côte à côte, tableau par plat dense |
| Connexion | Inchangé (immersif) | Photo en bandeau haut, formulaire en carte flottante | Split 58/42, formulaire de 400 px maximum, photo cadrée, plafonné sur ultrawide |

## 4. Fichiers concernés

Nouveaux : `src/components/shell/nav-rail.tsx`, `src/components/shell/app-sidebar.tsx` (shell étudiant), `src/features/bookings/bookings-table.tsx`,
`src/features/wallet/history-table.tsx`, `src/features/menus/week-planner.tsx`, `src/features/admin/orders-table.tsx`.

Modifiés : `src/routes/_authed.tsx`, `src/routes/_authed/app/route.tsx`, `src/routes/_authed/admin.tsx`, `src/components/app-header.tsx`,
`src/routes/_authed/app/index.tsx`, `src/features/menus/meal-card.tsx` (container query), `src/routes/_authed/admin/menus.tsx`,
`src/routes/_authed/admin/services.tsx`, `src/routes/_authed/admin/index.tsx`, `src/routes/auth.tsx`, `src/styles.css` (utilitaires de grille).

**Fichiers détenus par la session `vatel-refonte-2`** (non commités) : `app/bookings.tsx`, `app/wallet.tsx`, `features/wallet/*`, `components/page-header.tsx`.
Ils ne seront pas touchés tant que cette session ne les a pas livrés (voir la phase 2).

Interdits : `convex/**`, `src/lib/auth-*`, ledger, mutations, autorisations, `package.json` et lockfile.

## 5. Phasage (hackathon, livraison avant 18 h)

- **Phase 1, forte valeur et faible risque** : shells (rail et sidebar), Accueil desktop et tablette, planning Menus, tableau Commandes, cockpit Vue d'ensemble.
- **Phase 2**, après livraison de `vatel-refonte-2` : Mes repas et Solde (tableau et deux zones), Connexion tablette et ultrawide.
- **Validation de chaque phase** :
  - captures APRÈS aux mêmes tailles, puis 320, 600, 1024, 1920 et 2560 ;
  - zoom 200 %, clavier, état vide et texte long ;
  - typecheck, lint, tests, build ;
  - parcours P0 rejoués.
- La PR reste non fusionnée.
