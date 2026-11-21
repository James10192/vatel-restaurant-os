# PWA : rapport de la tranche PWA-1 (installable, sans mode hors ligne)

_21/11/2026, agent PWA (session isolée). Référence : issue #10, sections « PWA-A » et « PWA-1 »._

**Statut : PWA installable SANS mode hors ligne. Aucun service worker.**
Assets livrés et vérifiés. Le lien dans le `<head>` dépend d'un patch de `src/routes/__root.tsx` (fichier
partagé du lead) : **non appliqué dans cette branche**, à valider par le lead (voir « Patch à appliquer »).
Tant qu'il n'est pas appliqué, le navigateur ne découvre pas le manifeste : l'application n'est pas installable.

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

## Patch à appliquer (lead, `src/routes/__root.tsx`)
Insérer dans `head()` ; ne touche ni `ScriptOnce`, ni Better Auth, ni Convex, ni le SSR :
```diff
       { title: 'Vatel Restauration' },
+      { name: 'theme-color', content: '#072a5d' },
+      { name: 'application-name', content: 'Vatel' },
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

## Vérifications réellement exécutées (patch appliqué localement, puis retiré)
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
| `<head>` SSR de `/auth` | `link rel=manifest`, `apple-touch-icon`, `meta theme-color`, `application-name`, `apple-mobile-web-app-title` présents |
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

## Recette à faire après application du patch
1. `pnpm build` puis déploiement de prévisualisation HTTPS (ou `localhost`).
2. Android Chrome : menu, puis « Installer l'application » ; lancer depuis l'icône : fenêtre autonome, `/app` ou `/auth`.
3. iOS Safari : Partager, puis « Sur l'écran d'accueil » (aucune invite automatique sur iOS, l'événement
   `beforeinstallprompt` n'existe pas). Icône `vatel-apple-touch-180.png`, titre « Vatel ».
4. Bureau Chrome/Edge : icône d'installation dans la barre d'adresse.
5. Se déconnecter dans l'application installée : `/app` doit renvoyer vers `/auth`.

## Bouton « Installer » : non livré
Il demanderait de modifier le menu Profil (`src/`, fichier hors attribution) et un petit hook `beforeinstallprompt`.
Proposition pour une tranche validée : composant affiché **seulement** si l'événement `beforeinstallprompt` a été reçu
(Chrome, Edge, Android), masqué en mode `display-mode: standalone`, et sur iOS une simple aide « Partager, puis Sur l'écran
d'accueil ». Jamais de bannière automatique ni de bouton affiché sans API réellement disponible.

## Sécurité
- Aucun service worker, donc aucun cache applicatif : ni HTML authentifié, ni `/api/auth`, ni réponses Convex,
  ni solde, réservations, comptes ou données de mineurs. Le cache HTTP du navigateur reste celui de toute page web.
- Aucune file de mutations hors ligne : réservations, recharges, annulations et remises restent confirmées
  uniquement par le serveur, exactement comme dans le navigateur.
- Pas de notifications push (hors lot).
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
