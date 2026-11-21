# Vatel Restauration

Application de gestion de restauration pour établissement, réalisée pendant le hackathon **Vatel × Epitech Abidjan**
(21 novembre 2026). Prototype étudiant : il n'est pas un produit officiel approuvé par Vatel. Toutes les données sont fictives,
aucun paiement réel n'est effectué.

## Fonctionnalités livrées (vérifiées)
| Obligation (#1) | État | Preuve |
|---|---|---|
| Inscription et connexion | Livré | Navigateur ; inscription sans aucun droit, rattachement par l'établissement |
| Menu de la semaine | Livré | Navigateur + tests (brouillon invisible, allergènes « non renseignés » explicites) |
| Réservation d'un repas | Livré | Navigateur (double clic : un seul débit) + tests (survente, doublon, échéance) |
| Solde et historique | Livré | Navigateur + tests (journal en ajout seul, recharge **de démonstration** idempotente) |
| Administration des menus | Livré | Navigateur + tests (prix entiers FCFA, publication, plat publié verrouillé) |
| Commandes du jour | À faire (lot A3) | |
| Tableau de bord | À faire (lot A3) | |

Fiche recette légère : ingrédients, quantité pour N portions, unités et ingrédients créés sans quitter la fiche.

## Stack
TanStack Start + Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, Convex, Better Auth (composant officiel
Convex), pnpm, Vercel. Identité visuelle : logo et palette relevés sur vatel.ci, police Open Sans (voir `docs/DESIGN.md`).

## Lancer en local
Prérequis : Node 22+ (testé avec 26), pnpm, un compte Convex.
```bash
pnpm install
pnpm exec convex dev          # terminal 1 : crée/relie un déploiement dev et .env.local
pnpm exec convex env set BETTER_AUTH_SECRET "<valeur aléatoire>"
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm dev                      # terminal 2 : http://localhost:3000
```
Ajouter dans `.env.local` : `VITE_CONVEX_SITE_URL` (URL `.convex.site` du déploiement) et `VITE_SITE_URL=http://localhost:3000`.

Premier administrateur : s'inscrire sur `/auth`, puis
`pnpm exec convex run setup:bootstrap '{"canteenName":"…","canteenSlug":"…","adminEmail":"…"}'`.
Rattacher d'autres comptes : `pnpm exec convex run setup:attachAccount '{"canteenSlug":"…","email":"…","role":"student"}'`.

## Vérifications
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Les tests (Vitest + convex-test) couvrent : isolation entre établissements, droits par rôle, idempotence des recharges
et réservations, dernière portion disputée, solde insuffisant sans écriture partielle, remboursement unique, échéances,
dates invalides, redirections externes refusées.

## Déploiement
Voir `docs/DEPLOYMENT.md` (secrets, déploiements dev/prod séparés, rotation avant publication du dépôt).

## Limites connues
- Pas encore de commandes du jour ni de tableau de bord (lot A3).
- Rattachement des comptes par commande opérateur (écran de gestion des usagers prévu en P1).
- Après déconnexion, l'accès serveur prend fin à l'expiration du jeton de session (quelques minutes).
- Pas de versionnement des recettes : un plat publié est verrouillé, il faut en créer une nouvelle version.

## Développement assisté par IA
Code écrit pendant le hackathon avec l'assistance de Claude Code, sous la direction de l'équipe. Règles de travail :
`AGENTS.md` ; état courant : `docs/ai/HANDOFF.md`.
