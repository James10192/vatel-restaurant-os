# Scénario de démonstration live (10 minutes)

Support de la démo jury du hackathon Vatel × Epitech Abidjan (issue #15). Toutes les affirmations renvoient à ce qui
est vérifié dans le dépôt et dans l'issue #1 (preuves en production du 21/11). **Données fictives, crédits de
démonstration non convertibles, aucun paiement réel.**

- URL de production : **https://vatel-restauration.vercel.app**
- Durée : 10 minutes de démo dans un passage de 20 minutes (voir `docs/jury/PITCH.md`).
- Ce qui n'est **pas** montré comme opérationnel : assistant IA de menus, plan de production, espace parent, QR code,
  suivi des pertes, bascule français/anglais. Ces sujets sont des perspectives (épiques #2 à #10).

## 1. Deux rôles, deux appareils

| Rôle | Appareil | Compte | Écran de départ |
|---|---|---|---|
| Étudiant (convive) | Téléphone, navigateur en mode portrait | Compte étudiant fictif déjà rattaché, solde de départ connu | Accueil `/app` |
| Gérant (administrateur) | Ordinateur relié au projecteur | Administrateur de l'établissement de production, déjà connecté | Vue d'ensemble `/admin` |
| Nouvel inscrit | Ordinateur, fenêtre privée | Aucun compte : créé en direct | `/auth` |

Le téléphone est dupliqué à l'écran (recopie d'écran ou caméra de table) pour que le jury voie les deux rôles en même
temps. Si la recopie est impossible, l'étudiant se fait dans une deuxième fenêtre de l'ordinateur en largeur mobile.

## 2. Préparation (la veille et 30 minutes avant)

La veille :
- [ ] Créer les comptes de démo **par inscription** sur l'URL de production, avec de nouveaux mots de passe transmis
      hors dépôt (jamais écrits dans le dépôt, ni à l'écran, ni dans une capture).
- [ ] Faire rattacher le compte étudiant à l'établissement par l'opérateur (commande `setup:attachAccount`, hors
      interface). Ne jamais montrer cette commande ni un terminal au jury.
- [ ] Vérifier que des offres sont **publiées** pour le jour du passage et les jours suivants (19 offres publiées du 21 au
      28/11 au moment de la livraison ; en publier d'autres si le passage tombe après).
- [ ] Recharger le compte étudiant à un solde connu (par exemple 2 500 FCFA de démonstration) et noter ce solde.
- [ ] Préparer un plat **en brouillon** dans Menus (étape 4) pour gagner du temps.
- [ ] Répéter le scénario deux fois, chronomètre en main, à l'heure prévue du passage.

30 minutes avant :
- [ ] Ouvrir l'URL et vérifier qu'elle répond (accueil, connexion).
- [ ] Gérant connecté sur l'ordinateur, étudiant connecté sur le téléphone, fenêtre privée prête sur `/auth`.
- [ ] Notifications du système coupées, zoom du navigateur augmenté (125 %), aucun onglet sensible ouvert, pas de
      console développeur ni de tableau de bord Convex ou Vercel à l'écran.
- [ ] Partage de connexion du téléphone prêt en secours (section 6).

### Règle d'horaire à connaître (appliquée par le serveur)
Déjeuner à 12:00, dîner à 19:00, heure d'Abidjan. Réservation et annulation se ferment **2 heures avant** le service :
déjeuner jusqu'à 10:00, dîner jusqu'à 17:00. On ne désactive jamais cette règle pour la démo.
- Passage avant 10:00 : réserver le déjeuner du jour.
- Passage entre 10:00 et 17:00 : réserver le dîner du jour.
- Passage après 17:00 : réserver un repas du lendemain, et l'annoncer.

Le gérant ouvre ensuite Commandes du jour **à la date du repas réservé** (flèches « Jour précédent » et « Jour suivant »).

## 3. Déroulé minuté

Colonnes : écran, action, phrase à dire, ce que le jury doit voir. Les phrases sont des repères, pas un texte à réciter.

### 00:00 à 00:30 : ouverture

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur, Vue d'ensemble `/admin` | Montrer l'écran, sans cliquer | « Voici la journée du service restauration, en direct, sur l'application en production. Le téléphone, c'est un étudiant. » | L'URL de production, l'identité Vatel, le pourcentage de portions réservées |

### 00:30 à 01:45 : obligation 1, inscription et connexion

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Fenêtre privée, `/auth` | « Glisser pour commencer », puis « Créer un compte » : prénom, e-mail fictif, mot de passe (bouton afficher/masquer) | « N'importe qui peut s'inscrire… » | Le formulaire, le mot de passe masqué, le thème Clair/Sombre/Système dès cet écran |
| Fenêtre privée, `/app` | Valider « Créer mon compte » | « … mais une inscription ne donne **aucun droit**. L'établissement doit rattacher le compte. » | « Compte en attente de rattachement » : pas de menu, pas de réservation |
| Ordinateur | Fermer la fenêtre privée | « Le rattachement est fait par l'établissement, hors de l'interface pour ce prototype. Et le tout premier administrateur est créé une seule fois par une commande interne : un second essai est refusé. » | Rien de plus (aucun outil d'opérateur montré) |

Garantie montrée : inscription sans droit. Connexion : les deux appareils sont déjà connectés ; l'administrateur arrive
sur la Vue d'ensemble, l'étudiant sur l'accueil.

### 01:45 à 03:15 : obligations 2 et 5, menu de la semaine et administration des menus

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur, Menus `/admin/menus` | Montrer le planning de la semaine (7 colonnes, déjeuner et dîner) | « Le gérant compose sa semaine dans un planning. » | Le planning, les prix en FCFA, les portions |
| Ordinateur, panneau « Ajouter un plat » | Ouvrir le plat préparé en brouillon ou en créer un : nom, prix entier, allergènes, « Fiche recette » avec une ligne (ingrédient, quantité, unité créés sur place) | « La fiche recette est saisie avec le plat. Si un ingrédient ou une unité n'existe pas, on le crée sans quitter le formulaire. » | Le choix « choisir ou créer », la fiche qui garde sa saisie |
| Ordinateur | « Publier la semaine » | « Tant que ce n'est pas publié, l'étudiant ne voit rien. » | Le compteur de brouillons revient à 0 |
| Téléphone, accueil `/app` | Changer de jour avec le sélecteur | « Côté étudiant : 7 jours, déjeuner et dîner, prix, portions restantes, allergènes. » | Le nouveau plat publié, la jauge de portions, les allergènes (« non renseignés » si inconnus, jamais présentés comme absents) |

### 03:15 à 05:00 : obligations 3 et 4, réservation avec débit et solde

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Téléphone, accueil | Sur un repas ouvert (voir la règle d'horaire), « Réserver » | « L'étudiant réserve à l'avance. Avant de valider, il voit le prix et son solde après débit. » | Fenêtre « Confirmer la réservation » avec « Solde après réservation » |
| Téléphone | « Confirmer la réservation » | « Le serveur relit le prix en base, vérifie les portions et le solde, puis débite en une seule opération. » | Le solde baisse du prix exact, « Prochain repas » apparaît |
| Ordinateur, Commandes du jour `/admin/services` à la date du repas | Ne pas recharger la page | « Et le gérant le voit tout de suite, sans recharger. » | La commande apparaît dans « À servir » (mesuré à 0,4 s en test à deux navigateurs) |
| Téléphone, Solde `/app/wallet` | Ouvrir l'historique | « Chaque mouvement est inscrit dans un journal qui ne s'efface pas, avec le solde après chaque ligne. » | La ligne de réservation, le solde après, la mention « Crédits de démonstration, non convertibles » |

Si le temps le permet, montrer un refus : réserver un deuxième plat sur le même service donne « Déjà un repas ce
service ».

### 05:00 à 06:15 : annulation remboursée

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Téléphone, Mes repas `/app/bookings` | « Annuler la réservation », confirmer | « Avant l'échéance, l'étudiant peut annuler. Le remboursement est fait une seule fois. » | Le solde remonte du montant exact, une ligne de remboursement dans l'historique |
| Ordinateur, Commandes du jour | Observer | « Côté cuisine, la commande passe en annulée, la portion redevient libre. » | Compteur « Annulés » +1, portions libres +1 |
| Téléphone, accueil | « Réserver » de nouveau sur le même repas, confirmer | « On le reprend pour la suite de la démo. » | Nouveau débit, commande de nouveau « À servir » |

### 06:15 à 07:45 : obligation 6, commandes du jour et « Marquer remis »

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur, Commandes du jour | Filtrer par service, puis par statut « À servir » | « Au moment du service, l'équipe a sa file. Les filtres et la pagination sont faits côté serveur. » | Le tableau filtré, les filtres gardés dans l'adresse |
| Ordinateur | « Marquer remis » sur la commande de l'étudiant | « On remet le plateau. » | Statut « Remis » |
| Téléphone, Mes repas | Observer | « L'étudiant voit le statut changer. Un repas remis ne peut plus être annulé, et il ne peut pas être remis deux fois. » | Le repas passe dans l'historique avec le statut « Retirée », sans action d'annulation |

### 07:45 à 08:45 : obligation 7, vue d'ensemble

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur, Vue d'ensemble `/admin` | Montrer les indicateurs, puis cliquer sur « À servir » | « Le pilotage du jour : à servir, remis, annulés, portions libres, et le détail par plat. Ce sont les vraies réservations, mises à jour en temps réel. Un clic mène aux commandes filtrées. » | Les compteurs cohérents avec ce qu'on vient de faire, la jauge par plat, les montants étiquetés crédits de démonstration |

### 08:45 à 09:40 : interface adaptative

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur | Réduire la fenêtre progressivement (ou mode appareil du navigateur) sur Menus puis Commandes | « Même produit, trois compositions. Ordinateur : barre latérale, planning en 7 colonnes, tableaux. Tablette : rail d'icônes, liste et détail côte à côte. Téléphone : navigation au pouce, cartes verticales. » | Barre latérale, puis rail, puis barre du bas ; jamais de défilement horizontal |
| Ordinateur | Bascule Clair puis Sombre | « Thème clair, sombre ou celui du système. » | Le changement de thème sans changer de page |

### 09:40 à 10:00 : conclusion

| Écran | Action | Phrase | Le jury voit |
|---|---|---|---|
| Ordinateur, Vue d'ensemble | Revenir à l'écran d'ouverture | « Les sept fonctions demandées, en production, avec deux rôles et en temps réel. Toutes les données sont fictives, aucun paiement n'est réel. » | Retour au point de départ |

## 4. Les 7 obligations : où elles sont montrées

| Obligation (#1) | Moment | Preuve visible |
|---|---|---|
| Inscription et connexion | 00:30 | Compte créé en direct, « Compte en attente de rattachement » ; deux comptes déjà connectés selon leur rôle |
| Menu de la semaine | 01:45 | 7 jours, déjeuner et dîner, prix, portions, allergènes |
| Réservation d'un repas | 03:15 | Confirmation avec solde après débit, refus d'un second repas sur le service |
| Solde et historique | 03:15 et 05:00 | Débit, remboursement unique, journal avec solde après chaque ligne |
| Administration des menus | 01:45 | Plat avec fiche recette, publication de la semaine |
| Commandes du jour | 06:15 | Filtres serveur, « Marquer remis » |
| Tableau de bord | 07:45 | Vue d'ensemble en temps réel |

## 5. Simulation recettes (explication orale, pas une fonctionnalité livrée)

L'application enregistre une fiche recette par plat (portions de référence, ingrédients, quantités, unités). Le calcul
des besoins matière n'est **pas** encore un écran du produit (épiques #5 et #6). Si le jury demande l'intérêt de la
fiche recette, on montre le raisonnement sur l'exemple fictif de l'issue #15, **en le présentant comme un calcul sur
hypothèses, pas comme une mesure chez Vatel** :

| Ingrédient (par portion) | 100 portions réservées | 90 portions (10 annulations avant préparation) | Écart |
|---|---|---|---|
| Riz cru brut 80 g | 8 kg | 7,2 kg | 0,8 kg |
| Poulet net 120 g, rendement 75 % | 12 kg net, soit 16 kg brut | 10,8 kg net, soit 14,4 kg brut | 1,6 kg brut |
| Tomate nette 50 g, rendement 90 % | 5 kg net, soit 5,56 kg brut | 4,5 kg net, soit 5 kg brut | 0,56 kg brut |
| Oignon brut 30 g | 3 kg | 2,7 kg | 0,3 kg |
| Huile 10 ml | 1 L | 0,9 L | 0,1 L |
| Assaisonnement 5 g | 0,5 kg | 0,45 kg | 0,05 kg |

Conversion : un sac de riz de 25 kg, 8 kg représentent 0,32 sac (conversion, pas une quantité commandée).

Phrase : « Parce que les repas sont réservés avant, la cuisine peut calculer ce qu'il faut préparer. Ici, 10 annulations
avant la préparation, c'est 0,8 kg de riz en moins à cuire. C'est un calcul sur des hypothèses fictives ; l'impact réel
se mesurerait pendant un pilote. » Ne jamais parler d'économies réalisées ni de gaspillage évité mesuré.

## 6. Plan de secours

| Incident | Réaction immédiate | Phrase |
|---|---|---|
| Wi-Fi de la salle coupé ou lent | Passer l'ordinateur et le téléphone sur le partage de connexion préparé. Les pages déjà ouvertes se resynchronisent seules à la reconnexion. | « Le réseau de la salle nous lâche, on passe sur la 4G. » |
| Application inaccessible (aucun réseau ou panne de l'hébergeur) | Basculer sur les captures réelles de `docs/design/adaptive/apres/` (liste ci-dessous) et dérouler le même scénario en les commentant. Dire clairement que ce sont des captures enregistrées, pas du direct. Aucune fausse interaction. | « Je vous montre des captures réelles faites sur l'application ; ce n'est plus du direct. » |
| Compte étudiant bloqué (mot de passe refusé, session expirée) | Se reconnecter depuis le gestionnaire de mots de passe hors écran. Sinon, faire la partie étudiant avec un second compte étudiant de secours déjà rattaché, préparé la veille. | « On passe sur un deuxième étudiant fictif. » |
| Compte gérant bloqué | Se reconnecter hors écran. Sinon, deuxième compte gérant de secours préparé la veille (rattaché avec le rôle administrateur par l'opérateur). | « Même chose côté gérant. » |
| Réservation refusée « Les réservations sont closes pour ce service » | C'est l'échéance : réserver le service suivant ouvert. En faire un argument. | « Le serveur applique l'échéance de 2 heures, même pour nous. » |
| « Solde insuffisant » | Montrer la proposition de recharge, recharger en démonstration (1 000, 2 500, 5 000 ou 10 000), puis réserver. | « Le serveur refuse sans rien débiter ; on recharge en crédits de démonstration. » |
| « Plus de portions disponibles » | Choisir un autre plat publié. | « Pas de survente : quand il n'y a plus de place, c'est refusé. » |
| Le temps manque | Couper la partie adaptative (08:45), puis l'annulation (05:00). Ne jamais couper une des 7 obligations. | |

Captures de secours (réelles, faites sur l'application, mobile 375 px, tablette 834 px, ordinateur 1440 px) :

| Étape du scénario | Fichiers dans `docs/design/adaptive/apres/` |
|---|---|
| Accueil étudiant, menu de la semaine | `02-accueil-mobile-375.png`, `02-accueil-tablette-834.png`, `02-accueil-desktop-1440.png` |
| Vue d'ensemble | `05-dashboard-mobile-375.png`, `05-dashboard-tablette-834.png`, `05-dashboard-desktop-1440.png` |
| Menus (planning) | `06-menus-mobile-375.png`, `06-menus-tablette-834.png`, `06-menus-desktop-1440.png` |
| Commandes du jour | `07-commandes-mobile-375.png`, `07-commandes-tablette-834.png`, `07-commandes-desktop-1440.png` |
| Adaptatif de 320 à 2560 px | dossier `matrice/` |

Il n'existe pas de capture « après » pour la connexion, le solde et Mes repas : les captures « avant » de
`docs/design/adaptive/avant/` (`01-auth`, `03-reservations`, `04-solde`) montrent ces écrans dans leur version
antérieure ; les présenter comme telles. À faire avant le passage si possible : une courte vidéo réelle du scénario
complet sur la production, à présenter comme un enregistrement.

## 7. À ne pas dire

- Pas de chiffre d'usage, de client, d'économie ou de gaspillage évité : il n'y en a pas.
- Pas d'IA dans le produit livré : l'IA a servi à développer (voir le pitch), pas à calculer.
- Pas de « paiement » : ce sont des crédits de démonstration.
- Ne pas dire qu'un repas remis est un repas mangé.
- Ne pas montrer : terminal, commandes d'opérateur, tableau de bord Convex ou Vercel, mot de passe, e-mail réel.
