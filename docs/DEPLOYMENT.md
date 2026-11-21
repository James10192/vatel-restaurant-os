# Déploiement sécurisé

Cible : **Vercel** (application TanStack Start) + **Convex** (base, fonctions, auth). Deux déploiements Convex
distincts : `dev` (développement, comptes de démo) et `prod` (jury). Aucune donnée ni compte n'est copié de dev vers prod.

## Secrets : où ils vivent
| Variable | Où | Remarque |
|---|---|---|
| `BETTER_AUTH_SECRET` | Convex (`pnpm exec convex env set`, par déploiement) | Générer une valeur aléatoire **différente** pour prod. Jamais dans Vercel, jamais dans le dépôt. |
| `SITE_URL` | Convex | URL publique exacte de l'app (ex. `https://<projet>.vercel.app`). |
| `CONVEX_DEPLOY_KEY` | Vercel, environnement Production uniquement | Clé de déploiement **prod** ; jamais côté client, jamais en Preview. |
| `VITE_CONVEX_URL` | Vercel (build + runtime) | Injectée par `convex deploy` au build ; la définir aussi pour l'exécution serveur. |
| `VITE_CONVEX_SITE_URL` | Vercel (build + runtime) | `https://<déploiement-prod>.convex.site`. |
| `VITE_SITE_URL` | Vercel | Identique à `SITE_URL`. |

`.env.local` (créé par `convex dev`) n'est jamais commité (`.gitignore`) ; `.env.example` ne contient aucune valeur.

## Étapes
1. `vercel login`, puis `vercel link` dans le dépôt (projet dédié à la démo).
2. Créer le déploiement Convex prod : `pnpm exec convex deploy` (une première fois, confirmer le projet).
3. Variables Convex prod :
   ```bash
   pnpm exec convex env set --prod BETTER_AUTH_SECRET "<valeur aléatoire générée localement, jamais collée dans un ticket>"
   pnpm exec convex env set --prod SITE_URL "https://<projet>.vercel.app"
   ```
4. Dans Vercel (Settings > Environment Variables, Production) : `CONVEX_DEPLOY_KEY` (Convex dashboard > Settings >
   Deploy keys, clé **prod**), `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL`, `VITE_CONVEX_URL`.
5. Commande de build Vercel :
   `pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name VITE_CONVEX_URL`
6. Déployer, puis sur l'URL réelle : inscription, connexion, page protégée, menu publié, réservation, annulation,
   solde, sur mobile 360 px et ordinateur, avec deux rôles.
7. Amorçage prod : la personne responsable s'inscrit sur `/auth`, puis l'opérateur exécute
   `pnpm exec convex run --prod setup:bootstrap '{"canteenName":"…","canteenSlug":"…","adminEmail":"…"}'`
   et **vérifie le nom et la date d'inscription renvoyés** avant de communiquer l'accès.

## Rotation des comptes de démonstration (avant de rendre le dépôt public)
Un mot de passe de démonstration figure dans l'historique (`ef1b2f5`, `3f74952`) ; l'historique n'est pas réécrit
(pas de force-push), la valeur est donc considérée comme **publique**. Elle ne vaut que sur le déploiement **dev**.
1. Sur le déploiement dev, supprimer ou neutraliser les comptes `gerant@demo.test`, `awa.etudiante@demo.test`
   et `admin@demo.test` (Convex dashboard > Data > composant `betterAuth` > tables `user`, `account`, `session`),
   ou changer leur mot de passe depuis l'application.
2. Supprimer le fichier local de l'ancien amorçage (mot de passe temporaire, hors dépôt) s'il existe encore.
3. Le déploiement prod ne contient aucun de ces comptes : créer les comptes de démo jury par inscription,
   avec de nouveaux mots de passe transmis hors dépôt.
4. Relancer `gitleaks git --redact` sur tout l'historique et vérifier qu'aucun autre secret n'apparaît.
5. Seulement ensuite, rendre le dépôt public (Settings GitHub), si le règlement le permet.
