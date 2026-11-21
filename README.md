# Vatel Restauration

Cantine anticipative pour établissement : les étudiants consultent le menu de la semaine, réservent et règlent leur repas
avec un porte-monnaie prépayé ; le service restauration compose les menus, sert les commandes du jour et pilote la journée.

Réalisé pendant le hackathon **Vatel × Epitech Abidjan** (21 novembre 2026). Prototype étudiant : ce n'est pas un produit
officiellement approuvé par Vatel. **Toutes les données sont fictives et aucun paiement réel n'est effectué** (crédits de
démonstration non convertibles).

**Démo en ligne : https://vatel-restauration.vercel.app**

## Les 7 fonctionnalités obligatoires
Toutes vérifiées le 21/11 **sur l'URL de production**, dans une session réelle, et couvertes par des tests automatisés.

| Obligation | Ce que fait l'application | Garanties vérifiées |
|---|---|---|
| Inscription et connexion | Inscription publique, connexion, espaces protégés, arrivée selon le rôle | Un inscrit n'a **aucun droit** tant que l'établissement ne l'a pas rattaché ; premier administrateur par amorçage interne **à usage unique** |
| Menu de la semaine | Semaine en 7 jours, déjeuner et dîner, prix en FCFA, portions restantes, allergènes | Brouillons invisibles des usagers ; allergènes inconnus affichés « non renseignés », jamais présentés comme absents |
| Réservation d'un repas | Réservation avec confirmation du prix et du solde après débit, annulation avant l'échéance | Pas de survente (3 réservations simultanées pour 2 places : exactement 2 confirmées), pas de double débit, un repas par service, échéance appliquée côté serveur |
| Solde et historique | Porte-monnaie, recharge de démonstration, historique paginé | Journal en ajout seul, solde jamais négatif, recharge idempotente et plafonnée, remboursement unique |
| Administration des menus | Planning hebdomadaire, création de plat avec fiche recette, publication | Prix entiers lus en base et figés à la réservation ; plat publié verrouillé |
| Commandes du jour | File des repas à servir, filtres par service, plat et statut, « Marquer remis » | Filtres et pagination côté serveur ; remise unique ; un repas remis ne peut plus être annulé |
| Tableau de bord | Taux de remplissage, à servir, remis, annulés, portions libres, détail par plat | Chiffres réels issus des réservations, mis à jour en temps réel ; montants étiquetés « crédits de démonstration » |

Temps réel natif (Convex) : une réservation apparaît chez le gérant **0,4 s** après, sans rechargement (test à deux
navigateurs).

## Au-delà des 7 obligations (livré et déployé)
- **Aide au choix** (Smart Menu, issue #3) : l'étudiant donne ses jours, son budget, un service, les allergènes à
  éviter et une envie ; il reçoit une sélection de repas publiés qui respecte ces contraintes. Les règles serveur
  décident (prix, budget, portions, échéance, allergènes) ; un modèle de langage facultatif choisit seulement parmi
  des offres déjà vérifiées et explique son choix, puis le serveur revalide tout. Sans modèle, quota atteint ou
  erreur : même calcul sans IA, signalé « Calcul sans IA ». Aucune réservation automatique : « Réserver » ouvre la
  confirmation habituelle. Vérifié en production le 21/11 (issue #3). Détails : `docs/ai/b1/SMART-MENU.md`.
- **Fiches techniques** (issue #13, page Gestion > Fiches techniques) : ingrédients, quantités et unités par plat,
  modification d'un plat jamais publié, nouvelle version pré-remplie pour un plat publié (verrouillé), allergènes par
  ingrédient parmi les 14 allergènes majeurs, allergènes du plat déduits côté serveur (un seul ingrédient non
  renseigné rend le plat « non renseigné »), perte à la préparation et net par portion.
- **Application installable** (PWA) et page **Profil** : installation sur l'écran d'accueil, modification du nom et du
  mot de passe, apparence. Notifications push prêtes côté serveur (publication du menu), actives quand
  l'établissement a configuré ses clés. **Pas de mode hors ligne** : le service worker ne met rien en cache
  (`docs/pwa.md`).

## Une interface pensée pour chaque écran
Même produit et mêmes données, trois compositions (captures avant/après : `docs/design/adaptive/`) :
- **Mobile** : barre de navigation au pouce, cartes verticales, filtres en panneau, actions principales à portée.
- **Tablette** : rail d'icônes, liste et détail côte à côte (jours du menu, solde et historique).
- **Ordinateur** : barre latérale, catalogue de repas avec panneau fixe, planning hebdomadaire 7 colonnes, tableaux
  opérationnels (commandes, historique, réservations), cockpit de pilotage.

Thème Clair / Sombre / Système dès l'écran de connexion. Navigation complète au clavier, focus visible, aucun
défilement horizontal de 320 à 2560 px.

## Sécurité
- Chaque fonction serveur vérifie la session, le rôle, l'établissement et la propriété des données ; l'établissement
  n'est jamais fourni par le client. Audit d'autorisation de toutes les fonctions publiques : aucune faille critique ni
  élevée (issue #16).
- Arguments et retours validés sur toutes les fonctions publiques ; entrées libres bornées.
- Déploiements dev et prod séparés ; aucun secret dans le dépôt (analyse gitleaks de tout l'historique) ; les comptes de
  démonstration dont un mot de passe figurait dans d'anciens commits ont été supprimés.

## Performance (production, réseau Slow 3G, processeur ×4, écran 360 px)
- JavaScript transféré : **198 Ko** (brotli), budget de 200 Ko tenu ; 312 Ko au total.
- Décalage de mise en page (CLS) : **0**.
- Affichage principal (LCP) : 6 à 7 s en Slow 3G, au-dessus de l'objectif de 2,5 s (détail et pistes : issue #21).

## Stack
TanStack Start et Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, Convex, Better Auth (composant
officiel Convex), pnpm, Vercel. Identité visuelle : logo et palette relevés sur vatel.ci, police Roboto
(`docs/DESIGN.md`).

## Lancer en local
Prérequis : Node 22 ou plus (testé avec 26), pnpm, un compte Convex.
```bash
pnpm install
pnpm exec convex dev          # terminal 1 : crée ou relie un déploiement dev et écrit .env.local
pnpm exec convex env set BETTER_AUTH_SECRET "<valeur aléatoire>"
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm dev                      # terminal 2 : http://localhost:3000
```
Ajouter dans `.env.local` : `VITE_CONVEX_SITE_URL` (URL `.convex.site` du déploiement dev).

Premier administrateur : s'inscrire sur `/auth`, puis
`pnpm exec convex run setup:bootstrap '{"canteenName":"…","canteenSlug":"…","adminEmail":"…"}'`.
Rattacher d'autres comptes : `pnpm exec convex run setup:attachAccount '{"canteenSlug":"…","email":"…","role":"student"}'`.

## Vérifications
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
133 tests (Vitest et convex-test) : isolation entre établissements, droits par rôle, idempotence des recharges et des
réservations, réservations simultanées sur la dernière place, solde insuffisant sans écriture partielle, plafond de
démonstration, remboursement unique, échéances, dates invalides, redirections externes refusées, règles de l'Aide au
choix (budget, allergènes, revalidation des propositions du modèle), fiches techniques et allergènes déduits.

Intégration continue GitHub Actions à chaque PR et sur `main` : installation au lockfile figé, typecheck, lint, tests,
build et analyse gitleaks de tout l'historique.

## Déploiement
Vercel et Convex, procédure pas à pas et état vérifié : `docs/DEPLOYMENT.md`.

## Limites connues
- Rattachement des comptes par commande opérateur (écran de gestion des usagers prévu).
- Pas encore de calcul des besoins matière à partir des réservations (Smart Production, #5), ni de suivi des stocks et
  du gaspillage réel (#6).
- Pas d'espace parent (#8), pas de remise par QR code (#4), pas de mode hors ligne.
- Interface en français ; la version anglaise est en cours de revue (PR #39), non livrée.
- Après déconnexion, l'accès serveur prend fin à l'expiration du jeton de session (quelques minutes).
- Recharge uniquement en crédits de démonstration : aucun prestataire de paiement réel n'est branché.

## Développement assisté par IA
Code écrit pendant le hackathon avec l'assistance de Claude Code, sous la direction de l'équipe. Règles de travail :
`AGENTS.md` ; journal de développement : `docs/ai/HANDOFF.md`.

## Soutenance
Scénario de démo live et plan de secours : `docs/jury/SCENARIO-DEMO.md` ; contenu du pitch : `docs/jury/PITCH.md`.
