# DESIGN.md : identité Vatel

## Statut
Charte PDF officielle non fournie. Valeurs **relevées le 21/11/2026** sur https://www.vatel.ci/ :
feuille `/dist/app.966fdddc.css` (classes nommées par Vatel) et logo SVG officiel. Remplacer si la charte arrive.
Prototype étudiant : ne jamais le présenter comme produit officiellement approuvé par Vatel.

## Logo
- `branding/vatel/logo-vatel-fond-blanc.svg` (copie intacte de vatel.ci) servi en `public/logo-vatel.svg`, aussi favicon.
- `branding/vatel/logo-vatel-footer.png` (footer vatel.ci).
- Composant unique : `src/components/brand-logo.tsx`. Sur fond bleu, poser le logo dans une pastille blanche, jamais le recolorer ni le redessiner.
- Anciens `branding/idj-ai-*.png` : interdits dans l'UI.

## Couleurs (noms Vatel issus du CSS de vatel.ci)
| Nom Vatel | Hex | Token |
|---|---|---|
| bleuvatel3 | `#072a5d` | `--primary` (clair), fond de l'écran d'accueil |
| bleuvatel2 | `#2b85bb` | `--ring` |
| bleuvatel | `#67b2e8` | `--primary` (sombre) |
| bleu logo | `#87c1eb` | réservé au logo |
| noir logo | `#1d1d1b` | `--foreground` |
| corail | `#ff5959` | accent ponctuel uniquement, pas pour les erreurs |
Les couleurs `color1..7` du site (jaune, vert, rose, orange) sont des couleurs de filières : non utilisées.

## Typographie
**Open Sans** (appliquée à tout le site vatel.ci via `*{font-family:Open Sans}`), auto-hébergée via
`@fontsource-variable/open-sans` (aucun appel Google Fonts, bon pour le faible débit). Repli : polices système.

## Règles d'écriture UI
- Français simple. **Aucun tiret long (—) ni demi-tiret (–) dans les textes visibles** : utiliser virgule, deux-points ou « | » dans les titres d'onglet.
- Prix « 1 500 FCFA ». Pas de jargon technique.

## Style shadcn : maia
Style **radix-maia** (shadcn v4, CLI 4.23.0) : contrôles 40 px+, cartes aux grands arrondis (`--radius: 0.875rem`,
`rounded-3xl` pour les cartes principales), espacement éditorial. Choisi pour #11 « gastronomique premium + fintech claire »
et #19 (cibles tactiles). Icônes **Lucide** conservées (#11) malgré le défaut Hugeicons du preset ; police Open Sans conservée.
`cn` vient du paquet officiel `cn` (mainteneur shadcn).

## Écrans
- Usager mobile : pas de bandeau haut, logo dans la page, barre du bas Accueil/Repas/Solde/Profil (+ Menus admin).
- Accueil : date + salutation, carte de solde (bleu Vatel, motif d'assiette), prochain repas, sélecteur de jours en pastilles, cartes repas (service, prix, jauge de portions, allergènes, action).
- Administration : barre latérale shadcn (Sidebar offcanvas), résumé de semaine, cartes jour.

## Composants et UX
- shadcn d'abord : blocs officiels (`@shadcn/login-02/03`, `signup-03`), `Field*`, `InputGroup`, `Alert`, `Spinner`, `Empty`.
- Mot de passe : toujours `PasswordInput` (afficher/masquer, `aria-pressed`).
- Rayon `--radius: 0.75rem`. Icônes Lucide avec `data-icon`. Pas de couleur en dur dans les composants.
- Animations d'entrée `tw-animate-css` sous `motion-safe:` uniquement (respect de « réduire les animations »).
- `/auth` : écran d'accueil bleu Vatel animé (titre, motif d'assiette, bouton Commencer) puis formulaire sur mobile ; deux colonnes sur ordinateur.
- Mobile 360px d'abord, cibles tactiles confortables, états loading/empty/error systématiques.

## Photo
`public/images/accueil-chef-*.webp` : Unsplash, photo `6jVutqtcgQs` (« A chef presents a beautifully plated dish »), licence Unsplash.
Cadrage : photo sur les 58 % supérieurs, `object-bottom`, voile `from-primary` pour la lisibilité du texte.
