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

1. **[A] Rotation des comptes démo dev : FAITE le 21/11 vers 14h.** `gerant@demo.test`, `awa.etudiante@demo.test` et
   `admin@demo.test` supprimés du composant `betterAuth` (`user`, `account`, `session`) par identifiant exact, via
   `convex run --component betterAuth adapter:deleteMany / deleteOne`. Vérifié : aucune ligne restante liée à ces comptes.
   Les profils applicatifs restent orphelins et inutilisables (une nouvelle inscription crée un autre identifiant).
2. **[A] Clé de déploiement : FAITE le 21/11 vers 14h05**, à la demande du porteur, de CLI à CLI sans affichage :
   `convex deployment token create <nom> --prod` lu en mémoire, format `prod:` vérifié, transmis par l'entrée standard à
   `vercel env add CONVEX_DEPLOY_KEY production --sensitive` (jamais en argument ni sur disque).
   Une première clé, créée lors d'un essai raté (jamais affichée ni stockée), n'a pas pu être révoquée par la CLI :
   **[P]** la révoquer au dashboard Convex (prod > Settings > Deploy keys, nom `vercel-production`).
3. **[A] Projet Vercel : FAIT le 21/11 vers 14h.** Projet `vatel-restauration` créé par `vercel link`, sans variable,
   **non connecté à GitHub** (aucun déploiement automatique ; connexion GitHub à ajouter au compte Vercel si souhaitée).
   Commande de build versionnée dans `vercel.json` : `pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name VITE_CONVEX_URL`.
   Région des fonctions : `iad1`, proche de Convex (US East), car chaque rendu serveur interroge la base.
4. **[A] Variables Vercel (Production) : FAITES.** `CONVEX_DEPLOY_KEY` (Secret), `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL`
   (Config, URL du déploiement **prod** ; `.convex.cloud` vérifiée en HTTP 200). Relues par `vercel env pull` dans un
   fichier temporaire supprimé aussitôt.
5. **[A] Convex prod** : `convex env set --prod BETTER_AUTH_SECRET` (aléatoire, généré et passé sans affichage) ;
   `SITE_URL` une fois l'URL Vercel connue.
6. **[A] Premier déploiement** : `vercel deploy --prod`. Puis sur l'URL réelle, en 360 px et 1280 px : inscription, connexion,
   page protégée, menu publié, réservation, annulation, solde, commandes, deux rôles.
7. **[P] Amorçage prod** : le responsable s'inscrit sur `/auth` ; **[A]** `convex run --prod setup:bootstrap '{…}'`,
   puis vérification du nom et de la date renvoyés avant de communiquer l'accès. Comptes de démo jury : inscription
   avec de nouveaux mots de passe transmis hors dépôt, rattachés par `setup:attachAccount --prod`.
8. **[A] Mesures #21** sur l'URL déployée (brotli réel) : Slow 3G, CPU ×4, 360 px ; LCP, CLS, octets.
9. **[P] Dépôt public** (Settings GitHub), seulement après les étapes 1 à 8 et si le règlement l'exige.
