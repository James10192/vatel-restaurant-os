# Pitch jury (20 minutes, 10 diapositives)

Contenu du support de soutenance (issue #15). Le deck est à mettre en forme à partir de ce texte, avec le logo Vatel et
uniquement des **captures réelles** (`docs/design/adaptive/apres/`). Chaque chiffre ci-dessous vient du dépôt
(`README.md`, `docs/DEPLOYMENT.md`) ou des issues #1, #16 et #21. Aucun chiffre d'usage, aucun client, aucun impact
mesuré : il n'y en a pas. Le scénario de démo est dans `docs/jury/SCENARIO-DEMO.md`.

## Chronométrage (ordre du guide officiel)

| Bloc | Durée | Diapositives |
|---|---|---|
| Problème | 2 min | 1, 2 |
| Solution | 3 min | 3 |
| Démo live | 10 min | 4 (transition), puis l'application |
| Technique, sécurité, performance | 2 min | 5, 6, 7 |
| Limites, suite, équipe | 1 min | 8, 9, 10 |
| Questions | 2 min | 10 reste affichée |

Si le jury préfère commencer par la démo, passer directement de la diapositive 1 à la 4, puis revenir à 2 et 3 en 3 min
au lieu de 5 (dire l'essentiel de chaque diapositive).

## Diapositive 1 : Vatel Restauration

- **Message clé** : « Et si la cantine connaissait les besoins de ses convives avant leur arrivée ? »
- **Contenu** : logo Vatel ; « Vatel Restauration, la cantine anticipative » ; URL de démo
  https://vatel-restauration.vercel.app ; « Prototype du hackathon Vatel × Epitech Abidjan, 21/11/2026. Données fictives,
  aucun paiement réel. »
- **Notes orales** (20 s) : « Nous avons construit en une journée une application de cantine où l'on réserve et règle son
  repas à l'avance, et où le service restauration voit sa journée en temps réel. Elle est en ligne, vous allez
  l'utiliser avec nous. »

## Diapositive 2 : Le problème

- **Message clé** : sans réservation, la cuisine prépare à l'aveugle et le convive attend.
- **Contenu** : les problèmes cités par le guide du hackathon, illustrés sur une journée de cantine : files d'attente au
  passage, quantités préparées sans connaître la demande (gaspillage), régimes et allergies mal connus, budget du
  convive difficile à suivre, gestion manuelle des menus et des commandes.
- **Notes orales** (1 min 40) : décrire une journée type, sans aucun chiffre : « Le matin, le chef ne sait pas combien
  viendront. À midi, tout le monde arrive en même temps. Le soir, on ne sait ni combien ont mangé ni ce qui reste. »
  Ne citer aucune statistique : nous n'en avons pas de sourcée pour Vatel.

## Diapositive 3 : La solution

- **Message clé** : réserver avant, c'est savoir avant.
- **Contenu** : une chaîne en quatre temps, deux espaces.
  1. Le gérant compose et publie le menu de la semaine (plats, prix en FCFA, portions, allergènes, fiche recette).
  2. L'étudiant réserve et règle avec un porte-monnaie prépayé (crédits de démonstration), annule avant l'échéance et
     est remboursé.
  3. La réservation arrive en temps réel dans les commandes du jour ; l'équipe marque chaque repas remis.
  4. La vue d'ensemble montre la journée : à servir, remis, annulés, portions libres, détail par plat.
  En plus : **Aide au choix** (l'étudiant donne budget, jours, allergènes à éviter et envie ; le serveur filtre, un
  modèle de langage facultatif choisit parmi des plats vérifiés et explique), **Fiches techniques** (allergènes par
  ingrédient, allergènes du plat déduits par le serveur, perte à la préparation) et application installable.
  Capture : `02-accueil-mobile-375.png` (étudiant) et `05-dashboard-desktop-1440.png` (gérant).
- **Notes orales** (3 min) : insister sur la chaîne et le temps réel, pas sur le nombre d'écrans. « Le point fort, ce n'est
  pas une fonction isolée : c'est que la réservation de l'étudiant devient, sans ressaisie, une ligne dans la file du
  service et un chiffre sur le tableau de bord. » Annoncer que les sept fonctions demandées sont livrées et vérifiées en
  production le 21/11, et qu'on va les montrer.

## Diapositive 4 : Démo live

- **Message clé** : les sept fonctions demandées, en production, avec deux rôles.
- **Contenu** : la liste des 7 obligations (inscription et connexion, menu de la semaine, réservation, solde et
  historique, administration des menus, commandes du jour, tableau de bord) ; en plus : Aide au choix, Fiches
  techniques ; « Étudiant sur téléphone, gérant sur ordinateur » ; l'URL.
- **Notes orales** (10 min) : dérouler `docs/jury/SCENARIO-DEMO.md`. En cas d'incident, appliquer son plan de secours
  et annoncer clairement si l'on passe sur des captures enregistrées.

## Diapositive 5 : Technique

- **Message clé** : une pile moderne où le temps réel est natif.
- **Contenu** :
  - **TanStack Start** et Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui : rendu serveur, routes typées.
  - **Convex** : base de données et fonctions serveur ; chaque mutation est une transaction ; les écrans s'abonnent aux
    données et se mettent à jour seuls (réservation visible chez le gérant **0,4 s** après, test à deux navigateurs).
  - **Better Auth**, via le composant officiel Convex : inscription et connexion par e-mail et mot de passe.
  - **Vercel** : hébergement, HTTPS, compression brotli ; déploiements dev et prod séparés.
  - **Vercel AI SDK** pour l'Aide au choix : un seul appel borné (15 s, quotas par usager et par établissement),
    modèle choisi côté serveur sur liste blanche, repli « Calcul sans IA » si le modèle échoue.
  - **133 tests** automatisés (Vitest et convex-test) et intégration continue GitHub Actions (typecheck, lint, tests,
    build, gitleaks) à chaque PR.
- **Notes orales** (40 s) : « Pas de rechargement, pas d'interrogation périodique : quand une réservation change, le
  serveur pousse la nouvelle donnée. Les règles métier sont dans le serveur, pas dans l'écran. »

## Diapositive 6 : Sécurité

- **Message clé** : le serveur décide de tout, et nous l'avons vérifié.
- **Contenu** :
  - Chaque fonction serveur vérifie la session, le rôle, l'établissement et la propriété des données ; l'établissement
    n'est jamais fourni par l'écran.
  - Audit d'autorisation de toutes les fonctions publiques : **aucune faille critique ni élevée** (issue #16).
  - Inscription sans aucun droit ; premier administrateur par amorçage interne à usage unique.
  - Argent de démonstration : prix relus en base, journal en ajout seul, solde jamais négatif, pas de survente
    (3 réservations simultanées pour 2 places : exactement 2 confirmées), pas de double débit, remboursement unique.
  - Secrets : analyse **gitleaks** de tout l'historique sans fuite ; les comptes de démonstration dont un mot de passe
    figurait dans d'anciens commits ont été supprimés.
- **Notes orales** (40 s) : citer un exemple concret de refus montré pendant la démo (compte non rattaché, échéance,
  second repas sur le même service).

## Diapositive 7 : Performance mesurée

- **Message clé** : mesuré en production sur un réseau lent, et dit honnêtement.
- **Contenu** (production, Slow 3G, processeur ×4, écran 360 px, cache vide, 4 essais, issue #21) :
  - JavaScript transféré : **198 Ko** en brotli, budget de 200 Ko tenu ; 312 Ko au total.
  - Décalage de mise en page (CLS) : **0**.
  - Affichage principal (LCP) : **6 à 7 s** en Slow 3G, **au-dessus** de l'objectif de 2,5 s.
- **Notes orales** (40 s) : « Sur un réseau très lent, 312 Ko prennent déjà environ 6 secondes à arriver. L'objectif de
  2,5 s n'est pas atteint ; pour y aller, il faut alléger le socle commun (React, routeur, Convex, authentification). »
  Ne pas présenter de mesure sur réseau rapide comme un résultat.

## Diapositive 8 : Limites connues

- **Message clé** : ce qui n'est pas fait, nous le disons.
- **Contenu** (README, section Limites connues) :
  - Rattachement des comptes par commande de l'opérateur ; écran de gestion des usagers prévu.
  - Pas encore de calcul des besoins matière à partir des réservations ni de suivi des stocks et du gaspillage réel ;
    la fiche technique en pose la base (ingrédients, quantités, perte à la préparation).
  - Après déconnexion, l'accès serveur prend fin à l'expiration du jeton de session (quelques minutes).
  - Crédits de démonstration uniquement : aucun prestataire de paiement branché.
  - Pas d'espace parent, de QR code, de mode hors ligne ni de version anglaise dans la version livrée (anglais en revue,
    PR #39).
  - Aide au choix : injection de prompt, quotas et repli couverts par les tests, mais non rejoués à la main en
    production ; latence non mesurée en réseau lent.
- **Notes orales** (20 s) : lire les titres, sans s'excuser : « C'est un prototype d'une journée ; voici la suite. »

## Diapositive 9 : Feuille de route

- **Message clé** : de la cantine anticipative à la cantine pilotée.
- **Contenu** (épiques du dépôt) :
  - #3 Smart Menu : première tranche livrée (Aide au choix) ; suite : programme sur plusieurs jours, abonnements,
    conseil nutritionnel.
  - #4 Smart Booking et Queue : créneaux et distribution.
  - #5 Smart Production : prévision des quantités et simulation des imprévus.
  - #6 Smart Waste : stocks, recettes, achats, prévention du gaspillage.
  - #7 Smart Wallet : recharges, abonnements, vrais paiements après validation.
  - #8 Espace parent : suivi des repas et préférences.
  - #9 Copilote administrateur et analyses.
  - #10 Fondations : sécurité, design, déploiement et pilote.
  - Vision d'ensemble : #2.
  Exemple de ce que permet la fiche recette (calcul sur hypothèses fictives de l'issue #15, pas une fonctionnalité
  livrée) : 100 portions à 80 g de riz cru, c'est 8 kg ; 10 annulations avant préparation, c'est 7,2 kg, soit 0,8 kg de
  moins à cuire.
- **Notes orales** (20 s) : « La prochaine étape est un pilote dans une vraie cantine Vatel, pour mesurer d'abord la
  situation de départ : attente, portions non retirées, pertes. Aucun impact n'est annoncé avant ces mesures. »

## Diapositive 10 : Équipe et usage de l'IA

- **Message clé** : une équipe qui dirige, une IA qui assiste, des règles écrites.
- **Contenu** :
  - Équipe : **[noms et rôles à compléter par l'équipe]**.
  - Code écrit pendant le hackathon avec l'assistance de Claude Code, sous la direction de l'équipe.
  - Règles de travail versionnées (`AGENTS.md`) : sécurité serveur obligatoire, aucun secret, aucun faux bouton, rien
    déclaré testé sans preuve ; journal de développement `docs/ai/HANDOFF.md`.
  - Garde-fous automatiques dans Git : analyse gitleaks avant chaque commit, messages de commit normalisés.
  - Dans le produit, l'IA est bornée : elle choisit et explique parmi des plats déjà filtrés par le serveur ; aucun prix,
    budget, droit ni allergène n'est calculé par un modèle, et rien n'est réservé sans confirmation.
  - Dépôt public : https://github.com/James10192/vatel-restaurant-os
- **Notes orales** (20 s) : « L'IA nous a fait gagner du temps d'écriture ; les décisions, les vérifications en production
  et les limites que vous venez de voir sont les nôtres. » Puis : « Merci, place à vos questions. » Laisser cette
  diapositive affichée pendant les questions.

## Réponses prêtes pour les questions

| Question probable | Réponse appuyée sur le dépôt |
|---|---|
| Que se passe-t-il si deux étudiants prennent la dernière portion ? | Transaction serveur : testé avec 3 réservations simultanées pour 2 places, exactement 2 confirmées. |
| Peut-on être débité deux fois ? | Non : clé d'idempotence sur la réservation et la recharge, journal en ajout seul, testé. |
| Un étudiant peut-il voir l'espace gérant ? | Non : le serveur refuse ; l'interface ne fait que masquer, le serveur revérifie. |
| Et les allergies ? | Allergènes déclarés par plat ; inconnus affichés « non renseignés », jamais présentés comme absents. |
| Le paiement est-il réel ? | Non : crédits de démonstration non convertibles ; un vrai prestataire viendra après validation (#7). |
| Combien d'utilisateurs ? | Aucun usager réel : prototype avec données fictives ; un pilote mesurerait l'usage. |
| Pourquoi une IA ? | Pour transformer une envie en sélection expliquée. Les règles (budget, allergènes, portions, échéance) restent dans le serveur ; sans modèle, le même calcul tourne et c'est affiché « Calcul sans IA ». |
| L'IA peut-elle recommander un plat dangereux pour un allergique ? | Non : les plats contenant l'allergène évité, ou aux allergènes non renseignés, sont écartés avant le modèle, et le serveur revérifie chaque proposition. |
| Pourquoi le chargement est-il lent sur réseau lent ? | Mesuré : 6 à 7 s en Slow 3G, le socle commun pèse ; pistes dans l'issue #21. |
