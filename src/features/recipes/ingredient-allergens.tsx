import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronRightIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '../../../convex/lib/allergens'
import { toKey } from '../../../convex/lib/validation'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useServerAction } from '#/lib/server-action'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { IngredientAllergenSheet } from './ingredient-allergen-sheet'
import type { Ingredient } from './ingredient-allergen-sheet'

type Filter = 'all' | 'missing' | 'with'
const statusOf = (i: Ingredient) =>
  i.allergens === undefined ? 'missing' : i.allergens.length + (i.otherAllergens?.length ?? 0) > 0 ? 'with' : 'none'

const STEPS = [
  'Déclarez les allergènes de chaque ingrédient, une seule fois.',
  'Chaque plat les reprend automatiquement depuis sa fiche technique.',
  'Les usagers sont alertés selon les allergies de leur profil.',
]

/** Ingrédients de l'établissement et leurs allergènes : la source unique de la déclaration des plats. */
export function IngredientAllergens() {
  const t = useT()
  const { data: refs, isPending } = useQuery(convexQuery(api.catalog.references, {}))
  const { run, pending, error } = useServerAction(useMutation(api.catalog.createIngredient))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const ingredients = [...(refs?.ingredients ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const counts = {
    all: ingredients.length,
    missing: ingredients.filter((i) => statusOf(i) === 'missing').length,
    with: ingredients.filter((i) => statusOf(i) === 'with').length,
  }
  const suggestions = [...new Set(ingredients.flatMap((i) => i.otherAllergens ?? []))]
  const shown = ingredients.filter((i) => (filter === 'all' || statusOf(i) === filter) && toKey(i.name).includes(toKey(search)))

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('ingredient') ?? '')
    if (await run({ name })) form.reset()
  }

  return (
    <section className="flex flex-col gap-5">
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3 rounded-3xl border bg-card p-4 shadow-card">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <span className="text-sm leading-snug">{t(step)}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-card md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('Rechercher un ingrédient')}
              placeholder={t('Rechercher un ingrédient')}
              className="pl-9"
            />
          </div>
          <form onSubmit={onCreate} className="flex gap-2">
            <Input name="ingredient" aria-label={t('Nouvel ingrédient')} placeholder={t('Nouvel ingrédient')} required maxLength={60} className="lg:w-56" />
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              {t('Ajouter')}
            </Button>
          </form>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={filter}
          onValueChange={(next) => next && setFilter(next as Filter)}
          aria-label={t('Filtrer')}
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all">{t('Tous ({n})', { n: counts.all })}</ToggleGroupItem>
          <ToggleGroupItem value="missing" className={cn(counts.missing > 0 && 'text-warning')}>
            {t('À renseigner ({n})', { n: counts.missing })}
          </ToggleGroupItem>
          <ToggleGroupItem value="with">{t('Avec allergènes ({n})', { n: counts.with })}</ToggleGroupItem>
        </ToggleGroup>
        <FormError message={error} />

        {isPending ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : shown.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{ingredients.length === 0 ? t('Aucun ingrédient') : t('Aucun ingrédient ne correspond')}</EmptyTitle>
              <EmptyDescription>{t('Ajoutez-en ici ou directement depuis la fiche recette d’un plat.')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {shown.map((ingredient) => (
              <li key={ingredient._id}>
                <IngredientAllergenSheet ingredient={ingredient} suggestions={suggestions}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      statusOf(ingredient) === 'missing' && 'border-warning/40 bg-warning/5',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate font-medium">{ingredient.name}</span>
                      <IngredientStatus ingredient={ingredient} />
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      {statusOf(ingredient) === 'missing' ? t('Renseigner') : t('Modifier')}
                      <ChevronRightIcon className="size-4" />
                    </span>
                  </button>
                </IngredientAllergenSheet>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Statut lisible : jamais « aucun » par défaut, un ingrédient non déclaré reste « à renseigner ». */
function IngredientStatus({ ingredient }: { ingredient: Ingredient }) {
  const t = useT()
  const status = statusOf(ingredient)
  if (status === 'missing') return <span className="text-xs font-medium text-warning">{t('Allergènes à renseigner')}</span>
  if (status === 'none') return <span className="text-xs text-muted-foreground">{t('Aucun allergène')}</span>
  return (
    <span className="flex flex-wrap gap-1">
      {ALLERGEN_CODES.filter((c) => ingredient.allergens?.includes(c)).map((c) => (
        <Badge key={c}>{t(ALLERGEN_LABELS[c])}</Badge>
      ))}
      {ingredient.otherAllergens?.map((name) => (
        <Badge key={name}>{name}</Badge>
      ))}
    </span>
  )
}
