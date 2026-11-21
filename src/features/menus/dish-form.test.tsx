// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, test, vi } from 'vitest'
import { DishForm } from './dish-form'

vi.mock('convex/react', () => ({ useMutation: () => () => Promise.resolve(null) }))

function buttonsOf(html: string) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attrs, inner]) => ({
    type: /\btype="([^"]+)"/.exec(attrs)?.[1] ?? 'submit (défaut HTML)',
    label: /aria-label="([^"]+)"/.exec(attrs)?.[1] ?? inner.replace(/<[^>]+>/g, '').trim(),
  }))
}

describe('fiche plat', () => {
  test('un seul bouton soumet la fiche ; les boutons de recette ne la soumettent pas', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <DishForm onSaved={() => undefined} />
      </QueryClientProvider>,
    )
    const buttons = buttonsOf(html)
    const submits = buttons.filter((b) => b.type !== 'button')
    expect(submits).toEqual([{ type: 'submit', label: 'Enregistrer le plat' }])
    for (const label of ['Ingrédient', 'Unité', 'Retirer la ligne', 'Ajouter un ingrédient']) {
      expect(buttons).toContainEqual({ type: 'button', label })
    }
  })
})
