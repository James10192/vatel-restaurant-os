# Déploiement sécurisé

Cible : **Vercel** (application TanStack Start, sortie Nitro) + **Convex** (base, fonctions, auth). Deux déploiements Convex
distincts : `dev` (développement, comptes de test) et `prod` (jury). Aucune donnée ni compte n'est copié de dev vers prod.
Ne jamais écrire de nom de déploiement, d'URL Convex ni de secret dans le dépôt (il deviendra public).

## État vérifié (21/11/2026, ~13h50)
| Point | Constat |
|---|---|
| CLI Vercel | 66.5.0, session active ; dépôt **non lié** à un projet (`.vercel/project.json` absent) |
| Build Vercel | `VERCEL=1 pnpm build` réussi : Nitro produit `.vercel/output` (Build Output API v3, runtime Node 24, assets `immutable`) |
| Convex prod | Déploiement prod **déjà créé** avec le projet, **vide** : aucune fonction, aucune table, aucune variable |
| Secrets | `gitleaks git --redact` sur tout l'historique : **aucune fuite** détectée |
| Mot de passe démo | Présent en clair dans l'historique (`ef1b2f5`, `3f74952`) ; non détectable par gitleaks (pas un format de clé). Valable sur **dev** uniquement |
| Nom du déploiement dev | Présent dans l'historique (`ef1b2f5`), et les routes d'auth Convex sont publiques : la rotation des comptes démo dev est **obligatoire** avant de rendre le dépôt public |

## Variables : où elles vivent
| Variable | Où | Lue par |
|---|---|---|
| `BETTER_AUTH_SECRET` | Convex prod (`convex env set --prod`) | `convex/auth.ts`. Valeur aléatoire **différente** de dev, générée localement, jamais affichée |
| `SITE_URL` | Convex prod | `convex/auth.ts` (`baseURL` Better Auth). URL publique exacte de l'app, sans `/` final |
| `CONVEX_DEPLOY_KEY` | Vercel, environnement **Production** uniquement | `convex deploy` au build. Jamais en Preview, jamais côté client |
| `VITE_CONVEX_URL` | Injectée au build par `convex deploy` ; **aussi** en variable Vercel (exécution serveur) | client + `src/lib/auth-server.ts` |
| `VITE_CONVEX_SITE_URL` | Vercel (build + exécution) | `src/lib/auth-server.ts` (proxy Better Auth) |

`VITE_SITE_URL` (dans `.env.example`) n'est lue par aucun code : facultative.

## Procédure (une étape à la fois, preuve, puis la suivante)
Légende : **[P]** porteur (compte ou décision personnelle), **[A]** agent après accord explicite.

1. **[A] Rotation des comptes démo dev** : supprimer `gerant@demo.test`, `awa.etudiant@demo.test` et `admin@demo.test`
   (composant `betterAuth` : tables `user`, `account`, `session` ; profils associés). Irréversible, sur dev uniquement.
2. **[P] Clé de déploiement** : Convex dashboard > projet > déploiement **prod** > Settings > Deploy keys > générer.
   La coller directement dans Vercel (étape 4), jamais dans un chat ni un fichier.
3. **[A] Projet Vercel** : `vercel link` (nouveau projet, équipe personnelle), commande de build :
   `pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name VITE_CONVEX_URL`.
4. **[P/A] Variables Vercel (Production)** : `CONVEX_DEPLOY_KEY` (porteur) ; `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL`
   (URL `.convex.cloud` et `.convex.site` du déploiement **prod**, lisibles au dashboard).
5. **[A] Convex prod** : `convex env set --prod BETTER_AUTH_SECRET` (aléatoire, généré et passé sans affichage) ;
   `SITE_URL` une fois l'URL Vercel connue.
6. **[A] Premier déploiement** : `vercel deploy --prod`. Puis sur l'URL réelle, en 360 px et 1280 px : inscription, connexion,
   page protégée, menu publié, réservation, annulation, solde, commandes, deux rôles.
7. **[P] Amorçage prod** : le responsable s'inscrit sur `/auth` ; **[A]** `convex run --prod setup:bootstrap '{…}'`,
   puis vérification du nom et de la date renvoyés avant de communiquer l'accès. Comptes de démo jury : inscription
   avec de nouveaux mots de passe transmis hors dépôt, rattachés par `setup:attachAccount --prod`.
8. **[A] Mesures #21** sur l'URL déployée (brotli réel) : Slow 3G, CPU ×4, 360 px ; LCP, CLS, octets.
9. **[P] Dépôt public** (Settings GitHub), seulement après les étapes 1 à 8 et si le règlement l'exige.
