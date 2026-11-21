# HANDOFF : état du développement

_Mis à jour : 21/11/2026 ~11h30 (Abidjan)_

## Lot actuel
**A3 terminé (commandes du jour, vue d'ensemble, remise). Les 7 obligations P0 de #1 ont une version fonctionnelle. En attente de validation avant C/livraison.**

## Fait en A0
- Scaffold officiel `@tanstack/cli@0.72.16` (React, pnpm, add-ons convex + shadcn, ESLint, adaptateur Vercel), copié dans le dépôt.
- Versions : TanStack Start 1.169.7, Router 1.170.46, React 19.2, TS 6.0.3 strict, Vite 8, Tailwind 4, convex 1.51.0,
  better-auth 1.7.26, @convex-dev/better-auth 0.13.1, @convex-dev/react-query 0.1.0.
- Convex dev : projet `vatel-restauration` (équipe djedjelipatrick), déploiement `vivid-labrador-591`. Env Convex : BETTER_AUTH_SECRET (généré, jamais affiché), SITE_URL.
- Better Auth via composant Convex officiel (email + mot de passe, min 8) : `convex/{convex.config,auth.config,auth,http}.ts`,
  `src/lib/auth-{client,server}.ts`, `src/routes/api/auth/$.ts`, token SSR dans `__root.tsx`, ConvexQueryClient `expectAuth` dans `router.tsx`.
- Routes : `/` → redirection, `/auth` (connexion/inscription, redirect interne validé), `/_authed` (layout protégé), `/app`.
- Thème Vatel provisoire dans `src/styles.css` (tokens shadcn, pile système, Manrope/Fraunces du starter supprimés). sonner/next-themes/typography retirés.
- Erreurs d'auth traduites en français (`src/features/auth/auth-errors.ts`).

## Preuves observées (navigateur intégré, localhost:3000)
- `/app` non connecté → redirigé vers `/auth?redirect=%2Fapp` ✅
- Inscription compte fictif → `/app` affiche « Bonjour Awa Test » (lu depuis Convex) ✅
- Déconnexion → `/app` redirige vers `/auth` ✅
- Mauvais mot de passe → « E-mail ou mot de passe incorrect. », reste sur /auth ✅ ; bon mot de passe → `/app` ✅
- Rendu 360px OK. `pnpm typecheck`, `pnpm lint`, `pnpm build` : OK.
- Comptes fictifs : `tests/fixtures/demo-accounts.md`.

## Correctifs A0 (retour porteur, 21/11 ~09h40)
- Auth refaite sur blocs officiels shadcn (login-02/03, signup-03) fusionnés en un seul `AuthForm` piloté par mode ; InputGroup afficher/masquer mot de passe ; Alert/Spinner/Empty.
- Écran d'accueil animé inspiré de la maquette Dribbble fournie, adapté restauration Vatel.
- Logo officiel Vatel, palette bleuvatel et Open Sans relevés sur vatel.ci (voir DESIGN.md). Tirets longs supprimés de l'UI.
- Skill `thermo-nuclear-code-quality-review` installée (invocation agent uniquement) + hook Stop `scripts/hooks/review-gate.mjs` ; commit-msg refuse Co-authored-by et attributions IA ; `attribution` vide dans settings Claude.
- Vérifié navigateur : accueil mobile → Commencer → formulaire ; œil afficher/masquer ; deux colonnes en 1280px ; connexion invalide puis valide.
- Accueil premium : photo Unsplash (chef présentant une assiette, `public/images/accueil-chef-{720,1400}.webp`, 44 Ko mobile), zoom d'entrée et apparition en cascade sous `motion-safe`.
- Schéma : `canteens` + `profiles` (role admin/student/parent/chef/distribution, index by_auth_user, by_canteen_role).
- Inscription conservée (#1) mais sans privilège : sans profil, `/app` affiche « Compte en attente de rattachement » (vérifié avec Awa Test).
- `convex/setup.ts` `bootstrap` (internalMutation) : crée l'établissement « Vatel Abidjan (démo) » + admin@demo.test, mot de passe généré serveur, exécuté une fois ; 2e appel refusé (vérifié). Mot de passe non versionné.

## Fait en A1
- Schéma : units, ingredients (clé dédoublonnée par établissement), dishes (prix défaut XOF, allergènes `unknown` | `declared{present,traces}`, recette {portions, lignes}), menuItems (date, service lunch/dinner, prix figé, capacité, draft/published) + index.
- Accès : `convex/lib/access.ts` (identité JWT `subject`, profil, tenant jamais client, `getOwned` = isolation). Validation `convex/lib/validation.ts` (XOF entier, capacité, dates ISO, noms).
- Fonctions : `catalog.references/createUnit/createIngredient` (idempotentes), `dishes.list/save`, `menus.adminWeek/publishedWeek/addItem/updateItem/removeItem/publishWeek`. `setup.attachAccount` (CLI).
- UI : en-tête commun (logo, Repas/Menus selon rôle, menu compte), `/admin/menus` (semaine, jours, Déjeuner/Dîner, Sheet « Ajouter » avec onglets catalogue/nouveau plat, Popover d'édition prix/capacité, Publier n brouillons), `/app` menu publié (MealCard, allergènes, semaine via `?week=`).
- Combobox « choisir ou créer » : ingrédient et unité créés sans quitter la fiche.
- Tests `pnpm test` : 8 convex-test (brouillon invisible, usager sans droit admin, non rattaché refusé, isolation A/B, prix entier, publié non supprimable, unité sans doublon, référence d'un autre tenant refusée).
- Navigateur : gérant crée « Riz sauce arachide » 1 200 FCFA, Arachide, Riz 0,8 kg pour 10 portions (Riz et kg créés sur place, nom et prix conservés), ajoute 80 portions lundi midi, publie ; Awa (étudiante) le voit ; Awa redirigée hors /admin/menus.

## Fait en A2
- Schéma : wallets (solde), walletEntries (journal en ajout seul, clé d'idempotence), bookings (prix et nom figés, statut), canteens.policy optionnelle (défauts `convex/lib/policy.ts` : déjeuner 12:00, dîner 19:00, échéance 120 min, recharge démo max 50 000).
- `convex/lib/ledger.ts` `appendEntry` : seule écriture de solde, refuse solde négatif et montant non entier. `wallet.balance/history(paginé)/topUpDemo`, `bookings.book/cancel/mine`, capacité `lib/capacity.ts`.
- UI : solde + prochain repas sur l'accueil, carte repas (portions restantes, Réserver avec confirmation prix/solde après, Annuler), `/app/wallet` (recharge démo signalée, historique « Charger plus »), `/app/bookings`.
- Navigation #11 : barre du bas mobile Accueil/Repas/Solde/Profil (+ Menus admin), pas d'en-tête mobile, logo intégré à la page ; en-tête seulement sur ordinateur.

## Audit externe (commit dddfe3c) : corrections
1. Redirection /auth : `src/lib/safe-redirect.ts` (refuse //, /\, antislash, encodages, contrôles, schémas) + revalidation avant `location.assign`. 13 vecteurs testés ; navigateur : `?redirect=/\example.com` reste sur localhost.
2. Boutons de recette `type="button"` (+ combobox). Test SSR `dish-form.test.tsx` : un seul bouton submit ; le test échoue si le correctif est retiré (vérifié). Navigateur : « Ajouter un ingrédient » ne soumet pas.
3. Dates : `isIsoDate` strict partagé serveur/URL (refuse 2026-02-31, mois 13, formats partiels, années hors 2000-2100). Tests unitaires + serveur.
4. Identifiants : mots de passe retirés de `tests/fixtures/demo-accounts.md` ; historique gitleaks propre ; mot de passe démo présent dans `ef1b2f5`, `3f74952` → considéré public, rotation documentée (`docs/DEPLOYMENT.md`) AVANT publication du dépôt.
5. Plat publié verrouillé (`dishes.save` refuse si une offre publiée l'utilise ; index by_dish_status). Test.
6. Amorçage : plus aucun mot de passe généré. `setup:bootstrap` promeut un compte DÉJÀ inscrit (unique, renvoie nom/date pour vérification) ; `setup:attachAccount` exige le slug, refuse doublon/inconnu. Refus vérifiés sur dev par CLI (pas de convex-test : composant Better Auth non simulé).
- README et `docs/DEPLOYMENT.md` écrits (aucun secret). Options CLI vérifiées dans la version installée.
- Résultats : typecheck OK, lint OK, 60 tests OK, build OK.

## Refonte visuelle (retour porteur ~10h40)
- Preset shadcn **maia** appliqué (`shadcn apply maia`), Lucide et Open Sans rétablis, Hugeicons/Figtree retirés, tokens Vatel réappliqués (`src/styles.css`).
- Accueil repensé (sélecteur de jours, carte solde, cartes repas avec jauge), Solde et Mes repas harmonisés, `BalanceCard` partagé.
- Admin : layout `_authed/admin.tsx` avec Sidebar shadcn (#11) ; en-tête usager déplacé dans `_authed/app/route.tsx`.
- Vérifié : 390 px et 1280 px, console sans erreur sur page neuve ; typecheck, lint, 60 tests, build OK.

## Fait en A3
- `convex/admin.ts` : `dayOrders` (filtres serveur date/service/statut/plat, index `by_canteen_date_service` et `by_canteen_date_status`, paginé, nom affiché sans e-mail), `daySummary` (borné à un jour : capacité, réservés, retirés, annulés, restants, montant en crédits démo), `markPickedUp` (confirmée -> remise, une fois).
- `profiles.displayName` copié au rattachement (`setup.backfillDisplayNames` exécuté : 3 profils).
- UI : `/admin` Vue d'ensemble (4 indicateurs + tableau par plat), `/admin/services` Commandes du jour (filtres dans l'URL, curseur réinitialisé par Convex, « Charger plus », fin de liste), barre latérale Vue d'ensemble / Menus / Commandes du jour ; onglet mobile « Gestion ».
- Tests : 64 (dont 4 A3 : filtres, isolation, remise unique, synthèse, repas remis non annulable).
- Navigateur : Awa réserve -> gérant voit 1 « À servir », « Marquer remis » -> Vue d'ensemble : 0 réservé, 1 retiré, 1 annulé, 79/80, 1 200 FCFA démo.
- Mesure build prod local (sans throttling) : DOM prêt 2,7 s, liste visible 3,9 s, 681 Ko de JS transféré (serveur Node local non compressé). Dev : ~6 s.

## Reprise lead 21/11 ~12h30 (validation P0 + finitions)
- Vérifié : main = origin/main = 82c0e84 ; worktree `vatel-refonte-2` (feat/refonte-pages, base 23234e4 AVANT A3, non commité : wallet/bookings/page-header) ; non touché.
- Checks : typecheck, lint, **68 tests**, build OK. JS client (build prod) : 798 Ko brut / **254 Ko gzip** au total, 52 fichiers ; plus gros `index-*.js` 326 Ko / 104 Ko gzip.
- P0 navigateur (dev, comptes `qa.*@demo.test` créés par inscription, rattachés par CLI, mots de passe hors dépôt) : inscription sans droit ; rattachement visible sans rechargement ; gérant crée plat + 2 portions mardi 24 et publie ; étudiant recharge 2 500 (démo), réserve, solde insuffisant refusé avec proposition de recharge, annule (remboursement), historique 3 lignes ; /admin refusé à l'étudiant ; commandes filtrées, « Marquer remis » ; Vue d'ensemble cohérente.
- Corrigé : barre « Publier la semaine » masquée par la barre du bas mobile (`menus.tsx`) ; `dark` forcé sur /auth supprimé ; sélecteur Clair/Sombre/Système sur /auth (`components/theme-toggle.tsx`, même préférence que le Profil) ; accueil /auth centré (glisser, titre, paragraphe) ; Vue d'ensemble refaite (`features/admin/overview.tsx` : carte service bleu Vatel, jauge segmentée, indicateurs cliquables vers commandes filtrées, plats par service, état vide avec lien Menus) ; lien actif de la barre latérale avec `?date=` ; navigation de jour pleine largeur en mobile ; pluriel « 1 commande ».
- Constats non corrigés : grille admin lundi-vendredi alors que l'usager voit 7 jours ; un double-clic avant hydratation sur « Recharger » est perdu sans message (réseau lent) ; radiogroup des montants de recharge sans nom accessible ; FR/EN absent.

## Refonte adaptative, phase 1 (PR #28, non fusionnée, ~13h30)
- Worktree `vatel-adaptive`, branche `feat/adaptive-layouts`. Audit, matrice, principes et résultats : `docs/design/adaptive/PLAN.md` ; captures avant/après dans le même dossier.
- Coquille unique pilotée par CSS (`components/shell/`) : barre du bas < 768, rail 768 à 1279, barre latérale ≥ 1280. La sidebar shadcn admin et la barre du haut étudiante sont retirées.
- Accueil catalogue + panneau ; Menus en planning hebdomadaire (bureau), liste/détail (tablette) ; Commandes en tableau dès 1024 px ; Vue d'ensemble en cockpit (file à servir, tableau par plat).
- Vérifié : typecheck, lint, 68 tests, build ; 48 captures 320 à 2560 px sans défilement horizontal.
- Phase 2 en attente : Mes repas et Solde (fichiers de `feat/refonte-pages`), Connexion tablette/ultrawide, zoom 200/400 %, clavier.
- Développement local : connexion via :3000 uniquement (origine Better Auth), les cookies localhost valent pour :3001.

## B1 Smart Menu (worktree `vatel-b1`, branche `feat/b1-smart-menu`, PR non fusionnée, 21/11 ~14h05)
- Constat de départ (13h35) : main c67182a vert (typecheck, lint, 68 tests, build) ; **aucun projet Vercel ni Convex prod** ; rotation démo non faite ; travail non commité du lead sur `test/lot-c-preuves` (non touché). Porteur : go B1 isolé, arrêt dur 15h30.
- Isolation : backend Convex **local** (port 3210, `--dev-deployment local`), web :3002 ; le déploiement dev partagé `vivid-labrador-591` n'a pas reçu ce code.
- Livré : action `smartMenu.suggest` (rôle student, établissement du profil, menus publiés seulement), règles pures `convex/lib/smartMenu/rules.ts` (budget, un repas par jour, allergènes évités dont traces, inconnu = écarté si filtre), IA facultative `llm.ts` (AI SDK 7.0.173, AI Gateway, 2 outils lecture seule, `Output.object`, 4 étapes, 700 jetons, 15 s), revalidation totale, quotas `aiUsage` (8/usager/jour, 150/établissement/jour), panneau « Aide au choix » sur l'accueil usager, réservation via `BookMealDialog` existant.
- Modèle : Mercury 3 non testable (absent d'OpenRouter ; AI Gateway exige une carte). **Validé sur données fictives : `anthropic/claude-haiku-5.5` via OpenRouter** (`data_collection: deny`), 7/8 réussis, contraintes 100 %, ≈ 0,001 $ et 8,3 s en moyenne par demande. Clé OpenRouter sur le backend local uniquement (exposée en conversation : limite de dépense + rotation). Clé AI Gateway `vatel-b1-local` à révoquer.
- Tests : 99 (31 B1 : règles, modèle simulé, fournisseurs, serveur).
- Plats passés dans le prompt (outil listOffers retiré, 3 étapes) : 2 étapes, ~25 % de jetons en moins, latence inchangée (8,2 s en moyenne). Puis **un seul appel** (checkPlan supprimé, raisonnement désactivé) : 2,3 s en moyenne (3,0 s max), ≈ 0,0002 $ par demande ; 2 propositions hors budget serré rejetées par le serveur (repli sans IA). Puis **repère budgétaire** dans le prompt (sélection valide la moins chère + marge, calculées par `planByRules`) : 7/8 acceptées, budget serré 2/2, ~2,8 s en médiane (pics fournisseur à 8 à 15 s). Typecheck, lint, build OK. Navigateur 375/768/1440 : captures `docs/ai/b1/captures/`.
- Fichiers du lead touchés dans la branche : `convex/schema.ts` (table `aiUsage`, ajout seul), `package.json`/`pnpm-lock.yaml` (`ai`, `zod`, `@openrouter/ai-sdk-provider`), `src/routes/_authed/app/index.tsx` (montage du bouton). Fusion à arbitrer par le lead.
- Détails, coût/latence, limites : `docs/ai/b1/SMART-MENU.md`. Contrat B2 (sans code) : `docs/ai/b2/CONTRACT.md`.
- **Décision porteur (21/11 ~14h50)** : modèle B1 retenu = `anthropic/claude-haiku-5.5` via OpenRouter.
- **Gate humain restant** : (1) fusion après la livraison P0 ; (2) variables prod (`SMART_MENU_PROVIDER=openrouter`, `SMART_MENU_MODEL`, `OPENROUTER_API_KEY`) seulement après fusion ; (3) limite de dépense et rotation de la clé OpenRouter, révocation de `vatel-b1-local`.

## Non fait / risques
- Pas de Playwright E2E. Pas d'édition d'un plat existant (création seulement) ni de versioning recette (#13 P1).
- Révocation : accès serveur basé sur le JWT, effectif à son expiration.
- `admin@demo.test` (ancien amorçage, mot de passe temporaire dans un fichier local hors dépôt) : à supprimer sur dev, voir DEPLOYMENT.
- Texte d'accessibilité « Toggle Sidebar » en anglais (composant shadcn) : à traduire.
- Performance : 681 Ko de JS non compressé, au-delà du budget #19 : à traiter en C.
- Pas de déploiement Vercel (après P0, cf. #14) ; `vercel whoami` non vérifié.
- Charte PDF Vatel non reçue ; logo, couleurs et police relevés sur vatel.ci. Photo Unsplash (licence Unsplash), auteur à créditer si exigé.

## Prochaine action
Lot C : performance (découpage du JS, budget #19 ~200 Ko compressé), Playwright E2E 2 rôles, accessibilité ; puis déploiement Vercel/Convex prod selon `docs/DEPLOYMENT.md` et rotation des comptes démo. PR de refonte visuelle (session séparée) à relire.
