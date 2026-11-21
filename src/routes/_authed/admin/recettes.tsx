import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ArrowLeftIcon, PlusIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { DishVisual } from '#/components/dish-visual'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { cn } from '#/lib/utils'
import { DishForm } from '#/features/menus/dish-form'
import { DishDetail } from '#/features/recipes/dish-sheet-detail'
import { IngredientAllergens } from '#/features/recipes/ingredient-allergens'

type Search = { plat?: string; onglet?: 'ingredients' }

export const Route = createFileRoute('/_authed/admin/recettes')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    plat: typeof search.plat === 'string' && search.plat.length < 64 ? search.plat : undefined,
    onglet: search.onglet === 'ingredients' ? 'ingredients' : undefined,
  }),
  head: () => ({ meta: [{ title: 'Fiches techniques | Vatel Restauration' }] }),
  component: RecipesPage,
})

/**
 * Fiches techniques (#13). Plats : liste et détail côte à côte dès la tablette ; sur mobile, l'un puis l'autre.
 * Ingrédients : allergènes, source unique de la déclaration des plats. Sélection et onglet dans l'URL.
 */
function RecipesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: dishes, isPending } = useQuery(convexQuery(api.dishes.list, {}))
  const creating = search.plat === 'nouveau'
  const selected = dishes?.find((d) => d._id === search.plat)
  const open = (plat?: string) => navigate({ search: (prev) => ({ ...prev, plat }) })
  const detailShown = creating || Boolean(selected)

  return (
    <main className="workspace flex flex-col gap-6 py-6 md:py-8">
      <header className="flex flex-col gap-1">
        <p className="text-eyebrow text-muted-foreground">Cuisine</p>
        <h1 className="text-display">Fiches techniques</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Composition exacte de chaque plat, quantités brutes et pertes à la préparation ; les allergènes du plat sont déduits
          de ceux de ses ingrédients.
        </p>
      </header>

      <Tabs
        value={search.onglet ?? 'plats'}
        onValueChange={(value) => navigate({ search: (prev) => ({ ...prev, onglet: value === 'ingredients' ? 'ingredients' : undefined }) })}
      >
        <TabsList>
          <TabsTrigger value="plats">Plats</TabsTrigger>
          <TabsTrigger value="ingredients">Ingrédients et allergènes</TabsTrigger>
        </TabsList>

        <TabsContent value="plats" className="mt-4">
          <div className="grid gap-6 md:grid-cols-[17rem_minmax(0,1fr)] md:items-start xl:grid-cols-[20rem_minmax(0,1fr)]">
            <nav aria-label="Plats" className={cn('flex flex-col gap-2 md:sticky md:top-6', detailShown && 'max-md:hidden')}>
              <Button variant="outline" className="justify-start" onClick={() => open('nouveau')}>
                <PlusIcon data-icon="inline-start" />
                Nouveau plat
              </Button>
              {isPending ? (
                <Skeleton className="h-40 rounded-2xl" />
              ) : !dishes?.length ? (
                <p className="px-1 text-sm text-muted-foreground">Aucun plat pour l’instant.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {dishes.map((dish) => (
                    <li key={dish._id}>
                      <Link
                        to="/admin/recettes"
                        search={(prev) => ({ ...prev, plat: dish._id })}
                        aria-current={dish._id === search.plat ? 'page' : undefined}
                        className="flex items-center gap-3 rounded-2xl p-2 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-secondary"
                      >
                        <DishVisual name={dish.name} className="size-10 shrink-0 rounded-xl text-xs" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{dish.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {dish.recipe.lines.length ? `${dish.recipe.lines.length} ingrédient${dish.recipe.lines.length > 1 ? 's' : ''}` : 'Fiche vide'}
                          </span>
                        </span>
                        {dish.allergens.status === 'unknown' && <Badge variant="outline">À compléter</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </nav>

            <section aria-label="Fiche" className={cn('@container rounded-3xl border bg-card p-4 shadow-card md:p-6', !detailShown && 'max-md:hidden')}>
              <Button variant="ghost" size="sm" className="mb-3 md:hidden" onClick={() => open(undefined)}>
                <ArrowLeftIcon data-icon="inline-start" />
                Tous les plats
              </Button>
              {creating ? (
                <div className="flex flex-col gap-5">
                  <h2 className="text-xl font-semibold tracking-tight">Nouveau plat</h2>
                  <DishForm key="nouveau" onSaved={(id: Id<'dishes'>) => open(id)} />
                </div>
              ) : selected ? (
                <DishDetail key={selected._id} dish={selected} onSaved={(id) => open(id)} />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Choisissez un plat</EmptyTitle>
                    <EmptyDescription>Sa fiche s’affiche ici : composition, pertes et allergènes.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="ingredients" className="mt-4">
          <IngredientAllergens />
        </TabsContent>
      </Tabs>
    </main>
  )
}
