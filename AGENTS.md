# AGENTS.md — Vatel Restauration (hackathon Vatel × Epitech, 21/11/2026)

Contrat permanent pour tout agent (Claude Code, Codex, OpenCode). Court par design.
Identifiant interne historique : idj.AI (jamais visible dans l'UI).

## Avant chaque tâche
1. Lire ce fichier + `docs/ai/HANDOFF.md` (lot actif). Le dépôt prévaut sur le HANDOFF.
2. `git status`, branche, diff. Lire uniquement la `FICHE AGENT` / sections utiles des issues du lot
   (`gh issue view N --repo James10192/vatel-restaurant-os`). Index : #14. Ne jamais charger les 23 issues.
3. Lister 3–6 actions, fichiers concernés, définition de terminé. Un lot à la fois, STOP au gate humain.

## Priorités
Règlement officiel > 7 obligations #1 > sécurité #16 > lot actif #14 > bonus. Jamais sacrifier un P0.

## Stack verrouillée
TanStack Start/Router · React · TypeScript strict · Tailwind · shadcn/ui · Convex · Better Auth (intégration
officielle Convex) · Vercel AI SDK · pnpm · Vercel. Pas de 2e DB, Next.js, Redux, microservices.
Lire la doc de la version réellement installée (node_modules, `--help`). Ne jamais inventer API/version/commande.

## Règles produit
- Task-first, pas de page par entité/CRUD ; 12 routes max (voir #17 §3.3).
- Shadcn-first : réutiliser composants officiels et métier existants avant d'en créer.
- Création contextuelle des références (unités, ingrédients) dans le formulaire, sans perte de saisie.
- Recherche/tri/pagination côté serveur avec index Convex ; temps réel Convex natif, pas de polling.
- Français simple, prix XOF entiers, mobile 360px, réseau lent, états loading/empty/error.
- Branding : Vatel uniquement (logo officiel, Open Sans, palette bleuvatel), via `docs/DESIGN.md`. Ne pas utiliser `branding/idj-ai-*`.
- Aucun tiret long (—) ni demi-tiret (–) dans les textes visibles. Mot de passe toujours avec afficher/masquer.
- Inscription publique sans aucun privilège (compte non rattaché) ; premier admin via `setup:bootstrap` interne, unique (SEC-02 #16).

## Règles serveur (non négociables)
- Auth + rôle + tenant + ownership vérifiés dans CHAQUE fonction publique Convex ; tenant jamais fourni par le client.
- Validators args/returns ; mutations atomiques et idempotentes ; ledger append-only ; prix lus en base.
- Aucun paiement réel, aucune donnée personnelle réelle ; recharges = simulation étiquetée.
- IA : le LLM ne calcule ni prix ni autorisation ni allergènes et ne mute jamais directement (confirmation UI).

## Qualité
- Pas de god file (>250 lignes = revue), pas de hardcoding métier, pas de `any`/`@ts-ignore`, pas de faux bouton,
  de mock caché ou de succès non confirmé par le serveur. Aucun code KLASSCI/Joliba/projet préexistant.
- Après tâche : typecheck + lint + test ciblé + vérif navigateur si UI. Ne jamais déclarer testé ce qui ne l'est pas.

## Revue qualité
- Après toute modification de `src/` ou `convex/`, invoquer soi-même la skill `thermo-nuclear-code-quality-review`
  (`.agents/skills/`, `.claude/skills/`) et appliquer les corrections structurelles. Le hook Stop de Claude l'impose.

## Git et secrets
- Hooks : `git config core.hooksPath .githooks` (gitleaks staged, .env bloqué, conventional commits,
  aucun `Co-authored-by` ni mention « Generated with » / attribution IA).
- Jamais de secret commité/affiché ; `.env.example` sans valeur. Pas de force-push ni réécriture d'historique.
- Un seul agent écrit schema/auth/lockfile ; reviewers en lecture seule.

## Commandes
- `pnpm exec convex dev` (backend dev, terminal 1) · `pnpm dev` (web :3000, terminal 2)
- `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest + convex-test) · `pnpm build`
- Rattacher un inscrit (démo, CLI) : `pnpm exec convex run setup:attachAccount '{"email":"…","role":"student"}'`
- Accès serveur : `requireMember` / `requireAdmin` / `getOwned` (`convex/lib/access.ts`) dans CHAQUE fonction publique.
- Formulaires : `useServerAction` (`src/lib/server-action.ts`) + `FormError`.
- Variables Convex : `pnpm exec convex env list` (BETTER_AUTH_SECRET, SITE_URL). Jamais lire .env.local.
- Routes protégées : enfants de `src/routes/_authed/`. Auth serveur : `authComponent.safeGetAuthUser(ctx)`.
