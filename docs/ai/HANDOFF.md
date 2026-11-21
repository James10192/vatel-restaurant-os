# HANDOFF : état du développement

_Mis à jour : 21/11/2026 ~09h35 (Abidjan)_

## Lot actuel
**A0 terminé, en attente de validation humaine avant A1.** (STEP 00 validé, commit 1dabc00.)

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

## Non fait / risques
- Pas encore de tests automatisés (Vitest/convex-test/Playwright) : à poser en A1 avec la première logique métier.
- Connexion admin non testée dans le navigateur (mot de passe affiché uniquement au porteur). Rattachement d'un inscrit par l'admin : A1/admin users.
- Pas de déploiement Vercel (après P0, cf. #14) ; `vercel whoami` non vérifié.
- Charte PDF Vatel non reçue ; logo, couleurs et police relevés sur vatel.ci. Photo Unsplash (licence Unsplash), auteur à créditer si exigé.

## Prochaine action
A1 : schéma minimal (canteens, profils/rôles, menus, plats, recette légère), permissions, admin menu brouillon/publié, lecture menu semaine (#1, #11, #13, #22, #19).
