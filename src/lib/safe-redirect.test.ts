import { describe, expect, test } from 'vitest'
import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath', () => {
  test.each(['/app', '/app?week=2026-11-23', '/app/wallet#historique', '/admin/menus'])('accepte %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path)
  })

  test.each([
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '\\\\evil.com',
    '/%2Fevil.com',
    '/%5Cevil.com',
    '/\tevil.com',
    '/\n/evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    'app',
    '',
    '/%E0%A4%A',
  ])('refuse %j', (path) => {
    expect(safeRedirectPath(path)).toBeUndefined()
  })

  test('refuse les valeurs non textuelles', () => {
    for (const value of [undefined, null, 42, ['/app'], { to: '/app' }]) expect(safeRedirectPath(value)).toBeUndefined()
  })
})
