import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CreatableCombobox } from '#/components/creatable-combobox'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

export type RecipeLineDraft = { key: string; ingredientId?: Id<'ingredients'>; quantity: string; unitId?: Id<'units'> }

export const newLine = (): RecipeLineDraft => ({ key: crypto.randomUUID(), quantity: '' })

/** Lignes ingrédient | quantité | unité, avec création d'ingrédient et d'unité sans quitter la fiche. */
export function RecipeLines({
  portions,
  onPortionsChange,
  lines,
  onLinesChange,
}: {
  portions: string
  onPortionsChange: (value: string) => void
  lines: Array<RecipeLineDraft>
  onLinesChange: (lines: Array<RecipeLineDraft>) => void
}) {
  const { data: refs } = useQuery(convexQuery(api.catalog.references, {}))
  const createIngredient = useMutation(api.catalog.createIngredient)
  const createUnit = useMutation(api.catalog.createUnit)
  const update = (key: string, patch: Partial<RecipeLineDraft>) =>
    onLinesChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  return (
    <FieldSet>
      <FieldLegend>Fiche recette</FieldLegend>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="portions">Pour</FieldLabel>
        <Input
          id="portions"
          inputMode="numeric"
          className="w-20"
          value={portions}
          onChange={(e) => onPortionsChange(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">portions</span>
      </Field>
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-[1fr_5rem_1fr_auto] items-center gap-2">
            <CreatableCombobox
              label="Ingrédient"
              placeholder="Ingrédient"
              options={refs?.ingredients ?? []}
              value={line.ingredientId}
              onChange={(id) => update(line.key, { ingredientId: id as Id<'ingredients'> })}
              onCreate={(name) => createIngredient({ name })}
            />
            <Input
              aria-label="Quantité"
              inputMode="decimal"
              placeholder="Qté"
              value={line.quantity}
              onChange={(e) => update(line.key, { quantity: e.target.value })}
            />
            <CreatableCombobox
              label="Unité"
              placeholder="Unité"
              options={refs?.units ?? []}
              value={line.unitId}
              onChange={(id) => update(line.key, { unitId: id as Id<'units'> })}
              onCreate={(name) => createUnit({ name })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Retirer la ligne"
              onClick={() => onLinesChange(lines.filter((l) => l.key !== line.key))}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onLinesChange([...lines, newLine()])}>
        <PlusIcon data-icon="inline-start" />
        Ajouter un ingrédient
      </Button>
      <FieldDescription>Ingrédient ou unité absent : tapez son nom puis « Créer », la fiche reste intacte.</FieldDescription>
    </FieldSet>
  )
}
