import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { BanIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { FunctionReturnType } from 'convex/server'
import { AllergenPicker } from '#/components/allergen-picker'
import type { AllergyValue } from '#/components/allergen-picker'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

export type Ingredient = FunctionReturnType<typeof api.catalog.references>['ingredients'][number]

const valueOf = (ingredient: Ingredient): AllergyValue => ({ codes: ingredient.allergens ?? [], others: ingredient.otherAllergens ?? [] })

/**
 * Déclaration des allergènes d'un ingrédient : liste des 14 majeurs avec recherche, plus « Ajouter … » pour un
 * allergène hors liste. Deux issues explicites : enregistrer la sélection, ou déclarer « aucun allergène ».
 */
export function IngredientAllergenSheet({
  ingredient,
  suggestions,
  children,
}: {
  ingredient: Ingredient
  suggestions: Array<string>
  children: ReactNode
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<AllergyValue>(valueOf(ingredient))
  const { run, pending, error } = useServerAction(useMutation(api.catalog.setIngredientAllergens))
  const count = value.codes.length + value.others.length

  // À chaque ouverture, repartir de la déclaration enregistrée (pas d'un brouillon abandonné).
  const onOpenChange = (next: boolean) => {
    if (next) setValue(valueOf(ingredient))
    setOpen(next)
  }
  const save = async (next: AllergyValue) => {
    const result = await run({ ingredientId: ingredient._id as Id<'ingredients'>, allergens: next.codes, others: next.others })
    if (result === null) setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">{ingredient.name}</SheetTitle>
          <SheetDescription>
            {t('Quels allergènes cet ingrédient contient-il ? Les plats qui l’utilisent les reprendront à leur prochain enregistrement.')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <AllergenPicker value={value} onChange={setValue} suggestions={suggestions} addLabel={t('Ajouter un allergène')} disabled={pending} />
          <p className="text-xs text-muted-foreground">
            {t('Absent de la liste ? Tapez son nom puis « Ajouter » : il sera repris par les plats comme les autres.')}
          </p>
          <FormError message={error} />
        </div>
        <SheetFooter>
          <Button disabled={pending || count === 0} onClick={() => save(value)}>
            {pending && <Spinner data-icon="inline-start" />}
            {count === 0
              ? t('Enregistrer')
              : count > 1
                ? t('Enregistrer {n} allergènes', { n: count })
                : t('Enregistrer {n} allergène', { n: count })}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => save({ codes: [], others: [] })}>
            <BanIcon data-icon="inline-start" />
            {t('Cet ingrédient ne contient aucun allergène')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
