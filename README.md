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
70 tests (Vitest et convex-test) : isolation entre établissements, droits par rôle, idempotence des recharges et des
réservations, réservations simultanées sur la dernière place, solde insuffisant sans écriture partielle, plafond de
démonstration, remboursement unique, échéances, dates invalides, redirections externes refusées.

## Déploiement
Vercel et Convex, procédure pas à pas et état vérifié : `docs/DEPLOYMENT.md`.

## Limites connues
- Rattachement des comptes par commande opérateur (écran de gestion des usagers prévu).
- Fiche recette créée avec le plat mais pas encore modifiable ensuite ; allergènes saisis au niveau du plat ; pas encore
  de suivi des pertes ni du gaspillage (issues #13 et #6).
- Après déconnexion, l'accès serveur prend fin à l'expiration du jeton de session (quelques minutes).
- Recharge uniquement en crédits de démonstration : aucun prestataire de paiement réel n'est branché.

## Développement assisté par IA
Code écrit pendant le hackathon avec l'assistance de Claude Code, sous la direction de l'équipe. Règles de travail :
`AGENTS.md` ; journal de développement : `docs/ai/HANDOFF.md`.
