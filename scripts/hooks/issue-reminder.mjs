// Hook Claude Code (UserPromptSubmit, PostToolUse) : toutes les 10 minutes au plus, rappelle à l'agent
// de relire les règles des issues du lot actif (index #14) avant de poursuivre.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const INTERVAL_MS = 10 * 60 * 1000
const STAMP = '.claude/.issues-stamp'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
const last = existsSync(STAMP) ? Number(readFileSync(STAMP, 'utf8')) : 0
if (Date.now() - last < INTERVAL_MS) process.exit(0)
writeFileSync(STAMP, String(Date.now()))

// Lot actif lu dans le HANDOFF (première ligne en gras de « ## Lot actuel »).
const handoff = existsSync('docs/ai/HANDOFF.md') ? readFileSync('docs/ai/HANDOFF.md', 'utf8') : ''
const currentLot = handoff.match(/## Lot actuel\n\*\*([^*]+)\*\*/)?.[1] ?? 'inconnu'

// Table de lecture de l'index agent #14 (sections utiles uniquement).
const LOTS = {
  A0: '#1, #14, #12, #23, #16',
  A1: '#1, #11, #13, #22, #19',
  A2: '#1, #12, #7, #23, #16 (PAY)',
  A3: '#1, #21, #22, #23, #11',
  B1: '#3, #9, #18, #16',
  B2: '#5, #13, #16',
  B3: '#4, #16, #19',
  B4: '#8, #16, #19',
  C: '#15, #16, #21, #14 (gates finaux)',
}
const lots = Object.entries(LOTS)
  .map(([lot, issues]) => `${lot} : ${issues}`)
  .join(' | ')

const additionalContext = [
  'RAPPEL 10 MIN : relire les règles des issues avant de poursuivre.',
  `Lot actif (HANDOFF) : ${currentLot}.`,
  `Issues par lot (#14) : ${lots}. Toujours : #11 (UX : bottom bar mobile Accueil/Repas/Solde/Profil, 12 routes max, shadcn d'abord), #16 (sécurité).`,
  'Action : `gh issue view <N> --repo James10192/vatel-restaurant-os` et lire la FICHE AGENT + sections du lot ; vérifier que le travail en cours les respecte ; corriger tout écart avant de continuer.',
].join('\n')

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name ?? 'PostToolUse', additionalContext } }),
)
