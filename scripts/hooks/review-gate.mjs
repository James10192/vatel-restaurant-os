// Hook Claude Code "Stop" : impose la skill thermo-nuclear-code-quality-review
// une fois par état distinct du code (src/, convex/) non encore revu.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
if (input.stop_hook_active) process.exit(0)

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' })
const paths = ['src', 'convex', ':!convex/_generated', ':!src/routeTree.gen.ts']
const diff = git('diff', 'HEAD', '--', ...paths) + git('ls-files', '--others', '--exclude-standard', '--', ...paths)
if (!diff.trim()) process.exit(0)

const stampFile = '.claude/.review-stamp'
const hash = createHash('sha256').update(diff).digest('hex')
if (existsSync(stampFile) && readFileSync(stampFile, 'utf8') === hash) process.exit(0)
writeFileSync(stampFile, hash)

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: 'Code modifié non revu (src/ ou convex/). Invoque la skill thermo-nuclear-code-quality-review sur le diff courant, applique les corrections structurelles justifiées, relance typecheck/lint, puis termine.',
}))
