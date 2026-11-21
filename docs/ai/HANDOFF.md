# HANDOFF — état du développement

_Mis à jour : 21/11/2026 ~08h45 (Abidjan)_

## Lot actuel
**STEP 00 terminé — en attente de validation humaine avant A0.**

## Fait (STEP 00)
- Dépôt cloné (`main`, HEAD `0c5d67e`) ; contenu initial : README + `branding/idj-ai-*.png` (obsolètes).
- `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` (allow/ask/deny), `.gitignore`.
- Hooks Git `.githooks/` (pre-commit : .env/clé/conflit/gitleaks ; commit-msg : conventional commits), activés via `core.hooksPath`.
- `docs/DESIGN.md` : identité Vatel provisoire (valeurs observées sur vatel.ci, non officielles).
- Subagents Claude Code : Haiku 5.5 (`CLAUDE_CODE_SUBAGENT_MODEL`, réglage utilisateur).

## Outils vérifiés
Node 26.13.1 · pnpm 12.18.0 · git 2.56 · rg 15.2 · gh (connecté James10192) · vercel 66.5.0 · gitleaks 8.30.1 ·
claude 2.1.329 · codex 0.171.0 · opencode 1.19.6. Skills installées (utilisateur) : shadcn, convex(+authz/test/reviewer…),
better-auth (x3), ai-sdk, playwright-cli, vercel-react-best-practices, web-design-guidelines. Rien réinstallé.

## Décisions
- Branding Vatel exclusif ; police = pile système ; couleurs provisoires observées (voir DESIGN.md).
- Pas de guard Node séparé ni adaptateurs Codex/OpenCode : AGENTS.md suffit (portable), protection = settings Claude + hooks Git. CI GitHub en A0 après scaffold.

## Risques / blocages
- Charte et logo Vatel officiels non reçus des organisateurs.
- `vercel whoami` et login Convex non vérifiés (à faire par le porteur en A0).
- Hooks Git locaux contournables (`--no-verify` refusé dans settings Claude, pas pour un humain).

## Prochaine action
A0 : scaffold TanStack Start + shadcn + Convex + Better Auth, route protégée, test inscription/session (#14, #12, #23, #16).
