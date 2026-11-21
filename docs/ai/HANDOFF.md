# HANDOFF — état du développement

_Mis à jour : 21/11/2026 ~09h10 (Abidjan)_

## Lot actuel
**A0 terminé — en attente de validation humaine avant A1.** (STEP 00 validé, commit 1dabc00.)

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

## Non fait / risques
- Pas encore de tests automatisés (Vitest/convex-test/Playwright) : à poser en A1 avec la première logique métier.
- Pas de rôles ni d'établissement (tenant) : schéma vide, prévu A1 (staff jamais auto-promu).
- Pas de déploiement Vercel (après P0, cf. #14) ; `vercel whoami` non vérifié.
- Charte/logo Vatel officiels toujours non reçus.
- Texte provisoire sur `/app` (« Votre espace repas arrive au prochain lot ») à remplacer en A1.

## Prochaine action
A1 : schéma minimal (canteens, profils/rôles, menus, plats, recette légère), permissions, admin menu brouillon/publié, lecture menu semaine (#1, #11, #13, #22, #19).
