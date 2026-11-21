// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { EN } from './en'
import { translate } from './i18n'

/** Tous les fichiers de l'interface (hors composants shadcn générés). */
function sources(dir: string): Array<string> {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'ui' ? [] : sources(path)
    return /\.tsx?$/.test(name) &&
      !name.endsWith('.test.ts') &&
      !name.endsWith('.test.tsx')
      ? [path]
      : []
  })
}

/** Textes passés littéralement à `t('…')`, `t("…")` ou `t(`…`)` (sans interpolation de code). */
function keysIn(code: string): Array<string> {
  const keys: Array<string> = []
  for (const match of code.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/gs))
    keys.push(match[2].replace(/\\(['"`\\])/g, '$1'))
  return keys
}

describe('catalogue FR/EN', () => {
  const files = sources(join(process.cwd(), 'src'))
  const keys = new Set(
    files.flatMap((file) => keysIn(readFileSync(file, 'utf8'))),
  )

  test('chaque texte traduit dans le code a sa version anglaise', () => {
    const missing = [...keys].filter((key) => !(key in EN))
    expect(missing).toEqual([])
  })

  test('aucun tiret long ni demi-tiret dans les textes anglais (règle UI)', () => {
    expect(Object.values(EN).filter((value) => /[–—]/.test(value))).toEqual([])
  })

  test('les variables {nom} sont conservées en anglais', () => {
    const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join()
    expect(
      Object.entries(EN).filter(([fr, en]) => vars(fr) !== vars(en)),
    ).toEqual([])
  })

  test('interpolation et repli sur le français', () => {
    expect(translate('fr', 'Bonjour {name}', { name: 'Awa' })).toBe(
      'Bonjour Awa',
    )
    expect(translate('en', 'Texte inconnu du dictionnaire')).toBe(
      'Texte inconnu du dictionnaire',
    )
  })
})
