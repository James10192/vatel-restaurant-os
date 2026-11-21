# DESIGN.md — Identité Vatel (provisoire, à valider)

## Statut
Charte officielle Vatel **non reçue** à 08h40. Les valeurs ci-dessous sont **observées** sur https://www.vatel.ci/
le 21/11/2026 (feuille `/dist/app.966fdddc.css` et logo SVG). Ce ne sont **pas** des valeurs déclarées officielles.
Dès réception de la charte des organisateurs : remplacer et noter la source ici.
Prototype étudiant : ne jamais le présenter comme produit officiellement approuvé par Vatel.

## Logo
- Source observée : `https://www.vatel.ci/assets/svg/logo-vatel-fond-blanc.svg` (fond clair),
  `https://www.vatel.ci/assets/images/logo-vatel-footer.png` (footer).
- À intégrer dans `branding/vatel/` **uniquement** après autorisation des organisateurs. Ne jamais redessiner.
- Anciens `branding/idj-ai-*.png` : archivés, interdits dans l'UI.
- Libellé provisoire : « Vatel — Restauration ».

## Couleurs (observées, provisoires)
| Rôle token shadcn | Valeur | Origine observée |
|---|---|---|
| `--primary` | `#072a5d` (bleu marine) | couleur custom la plus fréquente du CSS vatel.ci |
| `--accent` | `#67b2e8` / `#87c1eb` (bleu clair) | CSS vatel.ci / logo SVG |
| `--foreground` | `#1d1d1b` (quasi noir) | logo SVG |
| `--background` | `#ffffff` | site |
| `--destructive` | rouge shadcn par défaut | `#ff5959` vu sur le site, non retenu comme marque |
Repères du brief : bleu, noir, blanc. Couleurs Bootstrap par défaut (`#007bff`, `#28a745`…) ignorées.
Contraste AA à vérifier (accent clair interdit en texte sur blanc).

## Typographie
Aucune police de marque observée (le site utilise la pile système Bootstrap). Choix : **pile système**
(`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) — rapide sur Android modeste, zéro téléchargement.
Pas de Geist/Inter/Manrope imposés.

## Conventions UX
- Un seul thème via variables CSS sémantiques shadcn (`src/styles`), aucune couleur en dur dans les composants.
- Icônes Lucide. Mobile 360px d'abord, cibles tactiles ≥ 44px, texte français simple, prix « 1 500 FCFA ».
- Composants métier réutilisés (#11) : MealCard, WeeklyMealPlan, BookingCard, WalletCard, StatusBadge, ConfirmationCard.
- États loading/empty/error systématiques ; pas de gradient « IA », pas de décoration gratuite.
