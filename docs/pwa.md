# PWA : rapport de la tranche PWA-1 (installable, sans mode hors ligne)

_21/11/2026, agent PWA (session isolée). Référence : issue #10, sections « PWA-A » et « PWA-1 »._

**Statut : PWA installable SANS mode hors ligne.** Mise à jour du même jour (décision porteur) : page Profil,
bouton Installer et **notifications push réelles** (section « Tranche 2 » plus bas). Le service worker ajouté
ne sert QU'aux notifications : aucun gestionnaire `fetch`, aucun cache.
Assets livrés et vérifiés. Patch de `src/routes/__root.tsx` (fichier partagé) **validé par le lead et appliqué**
dans cette branche. La meta `application-name` initialement proposée a été retirée en revue : redondante avec le
`short_name` du manifeste pour les navigateurs ciblés.

## Fichiers livrés (uniquement ceux attribués)
| Fichier | Rôle |
|---|---|
| `public/manifest.webmanifest` | Manifeste statique (servi tel quel par Nitro, aucun plugin) |
| `public/icons/vatel-192.png`, `vatel-512.png` | Icônes `any`, logo à 80 % de la hauteur sur fond blanc |
| `public/icons/vatel-maskable-192.png`, `vatel-maskable-512.png` | Icônes `maskable`, logo à 56 %, zone sûre vérifiée |
| `public/icons/vatel-apple-touch-180.png` | Apple Touch Icon iOS, fond blanc opaque (iOS remplit la transparence en noir) |
| `docs/pwa.md` | Ce rapport |

Aucun changement dans `convex/**`, l'auth, l'IA, `src/lib/theme.*`, `vite.config.ts`, `package.json`, `pnpm-lock.yaml`,
les variables d'environnement ou le déploiement. Aucune dépendance ajoutée (lockfile installé en `--frozen-lockfile`).

## Manifeste
- `id` `/app`, `start_url` `/app`, `scope` `/`, `display` `standalone`, `lang` `fr`.
- `theme_color` `#072a5d` (bleuvatel3, même couleur que le fond de l'écran d'accueil `/auth`), `background_color`
  `#ffffff` (même fond que les icônes, écran de lancement Android sans rupture).
- `start_url` `/app` testé : sans session, le serveur redirige en 307 vers `/auth?redirect=%2Fapp` (comportement
  normal de `_authed`). L'installation ne contourne donc ni Better Auth ni les contrôles Convex : l'application installée
  est la même application web, chaque requête reste vérifiée par le serveur.

## Icônes : origine et méthode
- Source unique : `public/logo-vatel.svg`, identique octet pour octet à `branding/vatel/logo-vatel-fond-blanc.svg`
  (copie intacte de vatel.ci, voir `docs/DESIGN.md`). Aucun fichier `branding/idj-ai-*` utilisé.
- Rendu par Chromium (Playwright déjà installé) : SVG d'origine dans un carré blanc, `object-fit: contain`.
  Ni recoloration, ni déformation, ni recadrage, ni redessin. Le logo complet (V, bandeau VATEL, mention
  « Hotel & Tourism Business School ») est conservé ; la mention devient peu lisible à 48 px, c'est le logo officiel tel quel.
- Zone sûre maskable vérifiée au pixel : distance maximale d'un pixel non blanc au centre = 199,4 px pour 512
  (limite 204,8 = 40 %) et 75,0 px pour 192 (limite 76,8). Les icônes `any` débordent du cercle, c'est attendu :
  elles ne sont pas déclarées `maskable`.

## Patch appliqué (validé par le lead, `src/routes/__root.tsx`)
Insertion dans `head()` ; ne touche ni `ScriptOnce`, ni Better Auth, ni Convex, ni le SSR :
```diff
       { title: 'Vatel Restauration' },
+      { name: 'theme-color', content: '#072a5d' },
+      { name: 'apple-mobile-web-app-title', content: 'Vatel' },
     ],
     links: [
       { rel: 'stylesheet', href: appCss },
       { rel: 'icon', type: 'image/svg+xml', href: '/logo-vatel.svg' },
+      { rel: 'manifest', href: '/manifest.webmanifest' },
+      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/vatel-apple-touch-180.png' },
     ],
```
Valeurs statiques, aucune lecture de `window` au rendu serveur, donc aucun risque d'écart d'hydratation.
`theme-color` unique (pas de variante clair/sombre) : la barre système reste bleu Vatel dans les deux thèmes,
sans changement de couleur à l'hydratation.

## Vérifications réellement exécutées (patch appliqué ; refaites après application définitive)
Environnement : conteneur cloud Linux, Chromium headless (Playwright), build de production Nitro `node-server`
servi sur `localhost:3100`. **Aucun backend Convex contacté** : un bouchon local répondait « pas de session » sur
`/api/auth/convex/token` (le conteneur n'a pas de `.env.local`, et il ne faut pas brancher un second client sur le dev du lead).

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck` / `pnpm lint` | OK / OK |
| `pnpm test` | 70 tests, 8 fichiers, OK |
| `pnpm build` | OK ; `manifest.webmanifest` et `icons/` copiés dans `.output/public` |
| `GET /manifest.webmanifest` | 200, `Content-Type: application/manifest+json`, JSON valide |
| Icônes 192, 512, maskable 512, apple-touch 180, `logo-vatel.svg` | 200 `image/png` (svg : `image/svg+xml`) ; dimensions exactes (`identify`), PNG RGB opaques |
| `<head>` SSR de `/auth` | `link rel=manifest`, `apple-touch-icon`, `meta theme-color`, `apple-mobile-web-app-title` présents |
| `/app` sans session | 307 vers `/auth?redirect=%2Fapp` |
| Chromium `Page.getInstallabilityErrors` | `[]` (aucune erreur d'installabilité) |
| Chromium `Page.getAppManifest` | manifeste trouvé, `errors: []` |
| Service worker / Cache Storage | 0 enregistrement, aucune cache |
| Console | aucune erreur |
| `/auth` à 360, 834, 1440 px, thèmes clair et sombre | pas de défilement horizontal ; la classe `dark` suit la préférence ; mise en page inchangée |

**Non vérifié (ne pas revendiquer)** :
- Installation réelle sur un appareil Android Chrome, sur iOS Safari et sur un Chrome de bureau avec lancement
  en mode autonome : aucun appareil ni navigateur graphique disponible dans cette session. « Installable » ne
  s'appuie ici que sur le diagnostic Chromium headless, pas sur une installation constatée.
- `/app` avec une session réelle (pas de backend Convex dans ce conteneur). Le patch ne change aucune logique
  d'auth ; à revérifier par le lead sur `pnpm dev` après application.
- Comportement sur Vercel : le préréglage Vercel n'a pas été construit ici (build local en `node-server`). Les fichiers
  de `public/` y sont servis en statique ; vérifier le `Content-Type` du manifeste après déploiement.

## Recette restante (appareils réels)
1. `pnpm build` puis déploiement de prévisualisation HTTPS (ou `localhost`).
2. Android Chrome : menu, puis « Installer l'application » ; lancer depuis l'icône : fenêtre autonome, `/app` ou `/auth`.
3. iOS Safari : Partager, puis « Sur l'écran d'accueil » (aucune invite automatique sur iOS, l'événement
   `beforeinstallprompt` n'existe pas). Icône `vatel-apple-touch-180.png`, titre « Vatel ».
4. Bureau Chrome/Edge : icône d'installation dans la barre d'adresse.
5. Se déconnecter dans l'application installée : `/app` doit renvoyer vers `/auth`.

## Tranche 2 : Profil, Installer, notifications push (porteur, 21/11 après-midi)
Le porteur a choisi « push réel maintenant » et une vraie page Profil. Cela touche des fichiers partagés
(schéma, `menus.ts`, coquille, `package.json`, lockfile) : modifications additives et minimales, listées ci-dessous.

### Page `/app/profile` (9e page sur 12)
- Onglet « Profil » de la barre du bas : ouvre la page (avant : un menu déroulant). Tablette et bureau : le menu
  compte garde ses raccourcis et gagne « Mon profil » et « Installer l'application ».
- Sections : identité (nom, e-mail, rôle, établissement, ou « en attente de rattachement »), Notifications (membres
  rattachés seulement), Application (installer), Apparence (thème), Mot de passe (Better Auth `changePassword`,
  ancien exigé, autres sessions révoquées, afficher/masquer), À propos (démo, aucun paiement réel, pas de hors ligne),
  Se déconnecter.
- Fichiers : `src/routes/_authed/app/profile.tsx`, `src/features/profile/*` (5 composants, < 120 lignes chacun).

### Bouton « Installer »
- `src/lib/install.ts` : écoute `beforeinstallprompt` dès `__root` (émis une seule fois par chargement), empêche la
  mini-bannière automatique, état `installed | available | ios | unavailable` via `useSyncExternalStore` (SSR : `unavailable`).
- Le bouton n'existe que si l'événement a réellement été reçu. iOS : marche à suivre Partager puis « Sur l'écran
  d'accueil ». Sinon : explication, aucun bouton.

- **En-tête mobile** (ajout du 21/11, ~17h45) : icône ronde « Installer l'application » à gauche du logo Vatel, sur
  toutes les pages mobiles (accueil compris), seulement quand `beforeinstallprompt` a été reçu ; absente sur iPhone (la
  marche à suivre reste dans le Profil), une fois installée, et dès la tablette (le menu compte la propose).
  `src/components/install-icon-button.tsx`. Vérifié avec un événement simulé : absente avant, visible sur Accueil et
  Mes repas à 360 px, `prompt()` appelé, retirée après le choix, invisible à 1440 px, pas de défilement horizontal.

### Notifications push
- Serveur : table `pushSubscriptions` (index endpoint, profil, établissement), `convex/push.ts`
  (`publicKey`, `subscribe`, `unsubscribe`, `sendTest` : `requireMember` partout ; `recipients`, `removeGone` internes),
  `convex/pushSend.ts` (action Node, `web-push` 3.6.7, VAPID), `convex/lib/notifications.ts` (catalogue de textes).
- Déclencheurs : « Envoyer un test » (appareils du membre) ; publication de la semaine par l'administration
  (`menus.publishWeek` planifie l'envoi dans la même transaction, seulement si des brouillons sont publiés).
- Client : `src/lib/push.ts` ; `public/sw.js` enregistré seulement à l'activation.
- Sécurité :
  - textes fixes et génériques, jamais de nom, solde, plat réservé ni donnée de mineur (écran verrouillé partagé) ;
  - **anti-SSRF** : le serveur n'accepte que les `endpoint` https des services push officiels (FCM, Chromium
    `jmt17.google.com`, Mozilla, Windows, Apple), sans port ni identifiants ; clés base64url bornées ;
  - au plus 10 appareils par membre ; un appareil réactivé par un autre compte change de propriétaire ;
  - un membre ne peut retirer que ses propres appareils ; isolation par établissement testée ;
  - **déconnexion** (`useSignOut`) : retrait serveur puis désabonnement navigateur, bornés à 2,5 s chacun, avant
    la fermeture de session (appareil partagé) ;
  - abonnements expirés (404/410) supprimés à l'envoi ; clé privée VAPID uniquement dans l'environnement Convex ;
  - le service worker ne suit au clic que des chemins internes (une URL externe dans la charge utile devient `/app`).
- Dépendances : `web-push@3.6.7`, `@types/web-push@3.6.4`. Le lockfile change aussi des clés de pairs
  (`supports-color`) sans changer de version. `eslint.config.js` ignore `public/**` (fichiers statiques hors projet TS).

### Rappel avant la clôture des réservations (ajout du 21/11, ~15h)
- `convex/crons.ts` : tâche toutes les 15 min ; `convex/reminders.ts` (`sendDue`, interne).
- Envoyé dans l'heure qui précède la clôture d'un service (clôture = début du service moins `cutoffMinutes`,
  politique de l'établissement ; défaut : déjeuner 10:00, dîner 17:00, heure d'Abidjan = UTC).
- **Un seul rappel** par établissement, jour et service (table `pushReminders`, posée dans la même transaction).
- Seulement s'il existe une offre publiée avec des portions restantes (service complet : rien).
- Seulement aux membres abonnés de l'établissement **sans réservation active** pour ce service ; texte générique
  (« Réservations du déjeuner : elles ferment bientôt »), aucun nom de plat ni prix.
- Horaires mal configurés : aucun rappel (jamais une heure fausse).
- Tests (3, horloge simulée) : rappel unique et ciblé (abonné sans réservation reçoit, abonné ayant réservé et
  établissement B exclus, second passage sans doublon) ; avant 09:00 et à 10:00 : rien ; service complet ou sans offre : rien.
- Exécuté sur le backend Convex local : `reminders:sendDue` renvoie `{ reminders: 0 }` à 15h (aucune clôture dans l'heure).
  **Non vérifié** : un passage réel du cron dans la fenêtre et la notification reçue sur un téléphone.

### Alerte de solde bas (ajout du 21/11, ~15h15)
- `convex/lib/lowBalance.ts`, appelé par `bookings.book` juste après le débit, dans la même transaction.
- Part **seulement au franchissement** du seuil (solde avant ≥ 2 000 FCFA, solde après < 2 000) : pas d'alerte à chaque
  réservation suivante ; une recharge puis un nouveau franchissement en redéclenchent une.
- Vers les appareils du seul membre concerné. Texte générique, **aucun montant** sur l'écran verrouillé ; le clic ouvre `/app/wallet`.
- Seuil `LOW_BALANCE_XOF = 2000` dans `convex/lib/notifications.ts` (à rendre réglable par établissement plus tard,
  ce qui demanderait de modifier `canteens.policy`).
- Le journal du solde (`ledger.ts`) n'est pas modifié.
- Tests (3) : alerte unique au franchissement et ciblée ; solde restant au-dessus : rien ; nouvelle alerte après recharge.
  Non vérifié sur un téléphone.

### Choix du type de notifications (ajout du 21/11, ~15h30)
- Section Notifications du Profil, bloc « Recevoir » : un interrupteur (composant officiel shadcn `Switch`, ajouté par
  la CLI) par famille : Menus de la semaine, Rappel avant la clôture, Solde bas. Le test reste toujours possible.
- **Par compte** (tous ses appareils), affiché même si cet appareil n'est pas abonné. Tout est reçu par défaut.
- Serveur : table `notificationPreferences` (familles coupées), `convex/notificationPreferences.ts` (`mine`, `set`,
  `requireMember`, idempotent) ; le filtrage se fait **à l'envoi**, à un seul endroit (`push.recipients` reçoit la
  notification et retire les membres qui ont coupé sa famille), donc aussi pour le rappel et le solde bas.
- L'interrupteur montre l'état relu sur le serveur : aucun changement affiché avant confirmation.
- Tests (3) : défaut, couper/réactiver idempotent ; non rattaché refusé ; à l'envoi, famille coupée exclue, autres
  familles et test conservés. Navigateur : « Rappel avant la clôture » coupé, conservé après rechargement, réactivé.

### Modification du nom (ajout du 21/11, ~15h45)
- Carte d'identité du Profil : bouton crayon « Modifier le nom », formulaire en place (Enregistrer / Annuler), fermé
  seulement après confirmation du serveur ; le nouveau nom s'affiche par la requête temps réel (profil, menu compte).
- Serveur : `convex/account.ts` `rename`. **Une seule transaction** : nom Better Auth (`auth.api.updateUser` via
  `authComponent.getAuth`) et copie montrée au personnel (`profiles.displayName`, commandes du jour). Identité lue dans
  la session, jamais fournie par le client. Ouvert aussi à un compte non rattaché (c'est son propre compte).
- Validation partagée `cleanName` : 1 à 80 caractères, espaces normalisés. E-mail, rôle et établissement non modifiables.
- Pas de test `convex-test` (le composant Better Auth n'y est pas simulé, comme pour l'amorçage) ; vérifié en navigateur
  sur le backend local : nom vide refusé par le serveur (« Nom : 1 à 80 caractères. »), « ␣␣Awa␣␣␣Koné␣ » enregistré
  en « Awa Koné » (initiales AK), conservé après rechargement, `displayName` vu par le personnel = « Awa Koné », puis
  nom d'origine restauré.

### Langue FR/EN (ajout du 21/11, ~17h)
- Sélecteur FR | EN : Profil (section Langue) et écran de connexion (à côté du thème). Choix propre à l'appareil.
- **Sans nouvelle bibliothèque.** Approche « gettext » : le texte français reste la clé dans le code (`t('Mes repas')`),
  `src/i18n/en.ts` donne l'anglais (≈ 380 entrées), un texte absent retombe en français. `src/i18n/i18n.tsx` :
  `LocaleProvider`, `useT`, `useLocale`, `translate` (variables `{nom}`).
- **Rendu serveur dans la bonne langue** : cookie `vatel-lang` lu par `__root` (même appel serveur que le jeton),
  `<html lang>` à jour, aucun clignotement ni écart d'hydratation ; changement de langue immédiat, sans rechargement.
- Dates dans la langue choisie (`formatDayLong/Short(iso, locale)`, `dateFormat(locale, options)`) ; montants en FCFA
  inchangés. Pluriels écrits en phrases entières (`{n} plats` / `{n} plat`), jamais par ajout de « s ».
- Messages d'erreur du serveur : traduits à l'affichage par `FormError` (même texte = même clé) ; un message avec
  valeur variable non répertorié reste en français.
- Notifications push : chaque abonnement enregistre la langue de l'application (`pushSubscriptions.locale`),
  les textes partent dans cette langue (`NOTIFICATIONS_EN`).
- Conversion faite par deux scripts (analyse TypeScript) puis corrections manuelles ; 59 fichiers `src/` touchés,
  textes français inchangés.
- Vérifications : test `src/i18n/catalog.test.ts` (chaque `t('…')` du code a sa traduction, pas de tiret long,
  variables conservées) ; typecheck, lint, 102 tests, build ; navigateur : 8 écrans étudiant et gestionnaire à 360 et
  1440 px en anglais puis en français, aucun texte de l'autre langue détecté (hors données : noms, établissement),
  pas de défilement horizontal ; bascule FR → EN sans rechargement, conservée après rechargement.
- Titres d'onglet traduits (ajout suivant) : `pageTitle(locale, page)` dans le `head()` de chaque page, langue lue dans
  le contexte du routeur (cookie) ; `setLocale` invalide le routeur, donc le titre suit la bascule sans rechargement.
  Le titre de repli de `__root` reste « Vatel Restauration » (le typer sur la langue crée une référence circulaire).
  Vérifié : 8 pages en FR et en EN (« Profil | Vatel Restauration » / « Profile | Vatel Dining »), bascule en direct.
- Messages serveur à valeur variable (ajout suivant) : modèles `EN_PATTERNS` (`'{label} : 1 à 80 caractères.'` →
  `'{label}: 1 to 80 characters.'`), reconnus côté client ; les valeurs capturées sont traduites si ce sont des libellés
  connus (Quantité → Quantity). Serveur et tests serveur inchangés. Le test de catalogue relit `convex/` et échoue si un
  `ConvexError` avec `${…}` n'a pas de modèle. Vérifié en navigateur : plafond de recharge atteint en anglais →
  « Demo balance capped at 100000 FCFA. ». Recherche dans le dictionnaire par `Object.hasOwn` (pas de clé héritée).

### Explication « Pourquoi » de l'IA en FR/EN (ajout du 21/11, ~18h)
- Le client envoie la langue de l'interface à `smartMenu.suggest` (`locale` facultatif, français par défaut : appels
  existants inchangés). `convex/lib/smartMenu/llm.ts` : `systemPrompt(locale)`, règles de sécurité identiques dans les
  deux langues, seule la consigne de langue des « reason » change. Validateur partagé `convex/lib/locale.ts`
  (aussi utilisé par les abonnements push).
- Avis du serveur (« Aide IA non configurée… ») et erreurs de la demande traduits côté client.
- Test (modèle simulé) : prompt en anglais si demandé, en français par défaut, règles présentes. **Non vérifié avec un
  vrai modèle** (aucune clé IA sur le backend local) : la langue réelle des réponses dépend du modèle configuré.

### À faire par le lead (sinon : « pas encore ouvertes par votre établissement », rien n'est envoyé)
Générer une paire de clés une fois, puis la poser sur CHAQUE déploiement Convex (dev, prod) :
```bash
pnpm exec web-push generate-vapid-keys --json
```
```bash
pnpm exec convex env set VAPID_PUBLIC_KEY <publicKey>
```
```bash
pnpm exec convex env set VAPID_PRIVATE_KEY <privateKey>
```
```bash
pnpm exec convex env set VAPID_SUBJECT mailto:<adresse de contact>
```
Ne jamais commiter la clé privée. Changer de paire invalide tous les abonnements existants.

### Vérifications de la tranche 2 (exécutées)
Backend Convex **local anonyme** (`convex deployment select local`), propre à ce conteneur, jamais relié au dev du lead ;
comptes fictifs `qa.admin@demo.test`, `qa.awa@demo.test`, mot de passe aléatoire non conservé.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (**102 tests** avec le rappel, l'alerte de solde, le choix des notifications et FR/EN ; 89 à cette étape, dont 21 nouveaux : anti-SSRF, refus non rattaché, clés
  invalides, idempotence et réattribution, retrait d'un appareil d'autrui refusé, test sans appareil refusé,
  isolation A/B, planification à la publication), `pnpm build` : OK. Déploiement local des fonctions (dont l'action
  Node `web-push`) : OK.
- Navigateur (Chromium) : onglet Profil actif sur `/app/profile` ; identité correcte ; mauvais mot de passe refusé
  (« Mot de passe actuel incorrect. »), changement effectif (ancien 401, nouveau 200) ; déconnexion vers `/auth`,
  abonnement navigateur supprimé ; `/app/profile` déconnecté renvoie vers `/auth?redirect=%2Fapp%2Fprofile`.
- Notifications : activation réelle (abonnement au service push Google), « Envoyer un test » accepté par le serveur,
  action `deliver` terminée en succès ; appel direct `deliver` : `{ sent: 2, removed: 0 }` (le service push a accepté).
  Affichage vérifié en injectant un push par le protocole DevTools (`ServiceWorker.deliverPushMessage`) : titre et texte
  affichés, URL externe neutralisée en `/app`, charge illisible remplacée par un texte générique ; Cache Storage vide.
- En navigation privée, Chrome refuse le push : message clair affiché, aucun succès annoncé.
- Bouton Installer : apparition et appel de `prompt()` vérifiés avec un événement `beforeinstallprompt` **simulé**
  (Chromium sans écran n'en émet pas) ; bouton retiré après le choix.
- 360, 834, 1440 px, clair et sombre : pas de défilement horizontal ; menu compte bureau : « Mon profil, Apparence,
  Se déconnecter ».

**Non vérifié** : réception visible d'une notification sur un vrai téléphone (Android, iOS 16.4+ installé) ou un
bureau ; fenêtre d'installation native réelle ; préréglage Vercel ; envoi sur le déploiement du lead (clés non posées).

## Sécurité
- Service worker limité aux notifications, sans gestionnaire `fetch` ni Cache Storage : ni HTML authentifié,
  ni `/api/auth`, ni réponses Convex, ni solde, réservations, comptes ou données de mineurs en cache.
- Aucune file de mutations hors ligne : réservations, recharges, annulations et remises restent confirmées
  uniquement par le serveur, exactement comme dans le navigateur.
- Notifications push : voir « Tranche 2 », textes génériques et désabonnement à la déconnexion.
- Le manifeste ne contient ni secret ni donnée personnelle.

## Risques et limites
- **Pas de mode hors ligne.** Sans réseau, l'application installée affiche l'erreur réseau du navigateur. PWA-2
  (page hors ligne, service worker limité aux assets publics) reste à cadrer, après examen de
  https://github.com/TanStack/router/issues/4988 et https://github.com/vite-pwa/vite-plugin-pwa/issues/902 avec les
  versions installées (TanStack Start 1.169.7, Router 1.170.46, Vite 8, Nitro 3.0.260610-beta). Aucun plugin PWA ajouté.
- Anciens navigateurs Chromium (avant 2024) qui exigeaient un service worker : ils n'afficheront pas l'invite
  d'installation, mais « Ajouter à l'écran d'accueil » reste possible.
- La mention textuelle du logo est petite sur les icônes de 48 px ; un pictogramme réduit (le seul « V ») exigerait
  un recadrage du logo, à faire valider par Vatel avant tout usage.
- Le build local émet un avertissement rolldown sur une directive, préexistant et sans lien avec la PWA.
