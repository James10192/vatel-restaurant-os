# Sessions IA parallèles — règles de non-interférence

> Guide de travail pour le hackathon Vatel. La session principale et son lot en cours priment. Aucun agent secondaire ne fusionne vers main.

## Répartition recommandée (maximum 3 sessions)
| Session | Branch/worktree | Écriture autorisée | Interdictions |
|---|---|---|---|
| Lead | existant/main | Lot métier courant (A1, A2, A3) : auth, Convex, schéma, routes et données | Aucun autre agent n'édite ces fichiers |
| UX-REVIEW | agent/revue-ux | `docs/ai/revue-ux.md` uniquement ; audit lecture seule des écrans et branding, contrastes, mobile 360px | Ne pas modifier `src/**`, `convex/**`, `package.json`, `pnpm-lock.yaml`, `.env*` |
| QA-REVIEW | agent/revue-qa | `docs/ai/revue-qa.md`, et tests isolés `tests/**` uniquement après validation du lead | Ne pas toucher aux sources, aux fixtures réelles, au déploiement, à la DB Convex ni aux configurations |

## PowerShell — dans la racine locale du dépôt existant
```powershell
git status --short
git branch --show-current
git worktree list
git worktree add -b agent/revue-ux ../vatel-revue-ux main
git worktree add -b agent/revue-qa ../vatel-revue-qa main
```

Puis ouvrir deux terminaux PowerShell séparés :
```powershell
# Terminal secondaire UX
cd ../vatel-revue-ux
claude
```
```powershell
# Terminal secondaire QA
cd ../vatel-revue-qa
claude
```

**Alternative :** depuis le dépôt principal, `claude --worktree revue-ux` crée et ouvre un worktree isolé automatiquement (version Claude CLI compatible). Choisir **soit** les worktrees Git manuels **soit** l'option Claude, pas les deux pour la même session.

## Contrat pour chaque session secondaire
1. Commencer par `git status --short`, nom de branche et lecture de `AGENTS.md`. Lire l'index #14 et la fiche de lecture de l'issue concernée.
2. Utiliser uniquement sa branche et ses fichiers attribués. Aucune édition croisée, aucun merge, reset --hard, force-push, rebase sauvage, modification d'AGENTS.md ou d'un guard.
3. Faire une recherche/audit ou rédiger des tests hors connexion sans toucher au backend du lead.
4. Si un correctif touche un fichier du lead, **le proposer en texte** dans la revue, ne pas l'écrire.
5. Créer son fichier de compte rendu distinct, fournir résultats observés, tests réellement effectués, commits localisés, puis STOP. Le lead intègre après revue et validation, au prochain gate.

## Attention Convex et ressources partagées
- Les Git worktrees isolent les fichiers, **pas** une instance Convex cloud ni les cookies, tokens et données applicatives.
- Ne pas lancer deux processus `convex dev` vers le même déploiement ni modifier schéma/functions/env depuis plusieurs sessions.
- Pour un vrai test backend parallèle, utiliser un déploiement/dev preview **distinct autorisé**, explicitement configuré et sans clé ni données prod. Sinon attendre le gate du lead.
- Chaque worktree peut avoir ses propres `node_modules` si nécessaires. Installer seulement après accord, lockfile gelé et sans modification de dépendances.
- Ne pas réserver le port web du lead ; si serveur auxiliaire nécessaire, utiliser un port distinct et des identifiants de test, après vérification.

## Relecture et intégration
```powershell
git worktree list
git -C ../vatel-revue-ux status --short
git -C ../vatel-revue-qa status --short
```
Une fois une branche prête et le lead au gate, le porteur vérifie sa PR, contrôle les conflits, teste sur une branche d'intégration, puis autorise l'intégration. Ne pas fusionner automatiquement.

Sources officielles : https://git-scm.com/docs/git-worktree ; https://support.claude.com/en/articles/14554000-claude-code-power-user-tips ; https://docs.convex.dev/production/multiple-deployments .
