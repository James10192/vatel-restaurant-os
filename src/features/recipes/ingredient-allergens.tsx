import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '../../../convex/lib/allergens'
import type { AllergenCode } from '../../../convex/lib/allergens'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useServerAction } from '#/lib/server-action'

type Ingredient = { _id: string; name: string; allergens?: Array<AllergenCode> }

/** Statut lisible : jamais « aucun » par défaut, un ingrédient non déclaré reste « non renseigné ». */
function AllergenStatus({ allergens }: { allergens?: Array<AllergenCode> }) {
  if (allergens === undefined) return <Badge variant="outline">Non renseigné</Badge>
  if (allergens.length === 0) return <Badge variant="secondary">Aucun allergène</Badge>
  return (
    <span className="flex flex-wrap gap-1">
      {ALLERGEN_CODES.filter((c) => allergens.includes(c)).map((c) => (
        <Badge key={c}>{ALLERGEN_LABELS[c]}</Badge>
      ))}
    </span>
  )
}

function EditAllergens({ ingredient }: { ingredient: Ingredient }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<Array<AllergenCode>>(ingredient.allergens ?? [])
  const { run, pending, error } = useServerAction(useMutation(api.catalog.setIngredientAllergens))
  // À chaque ouverture, repartir de la déclaration enregistrée (pas d'un brouillon abandonné).
  const onOpenChange = (next: boolean) => {
    if (next) setValue(ingredient.allergens ?? [])
    setOpen(next)
  }
  const save = async (allergens: Array<AllergenCode>) => {
    if ((await run({ ingredientId: ingredient._id as Id<'ingredients'>, allergens })) === null) setOpen(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Allergènes de ${ingredient.name}`}>
          <PencilIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{ingredient.name}</SheetTitle>
          <SheetDescription>Cochez les allergènes majeurs présents. Les plats les reprendront à leur prochain enregistrement.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={2}
            aria-label="Allergènes majeurs"
            value={value}
            onValueChange={(next) => setValue(next as Array<AllergenCode>)}
            className="grid w-full grid-cols-2"
          >
            {ALLERGEN_CODES.map((code) => (
              <ToggleGroupItem key={code} value={code} className="justify-start data-[state=on]:border-primary">
                {ALLERGEN_LABELS[code]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FormError message={error} />
        </div>
        <SheetFooter>
          <Button disabled={pending} onClick={() => save(value)}>
            {pending && <Spinner data-icon="inline-start" />}
            Enregistrer {value.length ? `(${value.length})` : ''}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => save([])}>
            Déclarer « aucun allergène »
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Ingrédients de l'établissement et leurs allergènes : la source unique de la déclaration des plats. */
export function IngredientAllergens() {
  const { data: refs, isPending } = useQuery(convexQuery(api.catalog.references, {}))
  const { run, pending, error } = useServerAction(useMutation(api.catalog.createIngredient))
  const ingredients = [...(refs?.ingredients ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const missing = ingredients.filter((i) => i.allergens === undefined).length

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('ingredient') ?? '')
    if (await run({ name })) form.reset()
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-card md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''}
          {missing > 0 && `, dont ${missing} non renseigné${missing > 1 ? 's' : ''}`}
        </p>
        <form onSubmit={onCreate} className="flex gap-2">
          <Input name="ingredient" aria-label="Nouvel ingrédient" placeholder="Nouvel ingrédient" required maxLength={60} className="md:w-56" />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
            Ajouter
          </Button>
        </form>
      </div>
      <FormError message={error} />
      {isPending ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : ingredients.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun ingrédient</EmptyTitle>
            <EmptyDescription>Ajoutez-en ici ou directement depuis la fiche recette d’un plat.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {ingredients.map((ingredient) => (
            <li key={ingredient._id} className="flex items-center gap-3 rounded-2xl border px-3 py-2">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium">{ingredient.name}</span>
                <AllergenStatus allergens={ingredient.allergens} />
              </span>
              <EditAllergens ingredient={ingredient} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
