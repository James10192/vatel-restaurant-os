# HANDOFF : état du développement

_Mis à jour : 21/11/2026 ~11h00 (Abidjan)_

## Lot actuel
**A2 terminé + audit externe corrigé, en attente de validation humaine avant A3.**

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

## Non fait / risques
- Pas de Playwright E2E. Pas d'édition d'un plat existant (création seulement) ni de versioning recette (#13 P1).
- Révocation : accès serveur basé sur le JWT, effectif à son expiration.
- `admin@demo.test` (ancien amorçage, mot de passe temporaire dans un fichier local hors dépôt) : à supprimer sur dev, voir DEPLOYMENT.
- Barre latérale admin : seule l'entrée Menus existe ; Vue d'ensemble et Services arrivent en A3, Usagers en P1.
- Pas de déploiement Vercel (après P0, cf. #14) ; `vercel whoami` non vérifié.
- Charte PDF Vatel non reçue ; logo, couleurs et police relevés sur vatel.ci. Photo Unsplash (licence Unsplash), auteur à créditer si exigé.

## Prochaine action
A3 : commandes du jour (filtres service/plat/statut, compte portions, statut retrait) et dashboard (réservés, annulés, retirés, restants ; réel vs simulation), barre latérale admin (#1, #21, #22, #23, #11).
