import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { Spinner } from '#/components/ui/spinner'
import { Textarea } from '#/components/ui/textarea'
import { useServerAction } from '#/lib/server-action'
import { RecipeLines, newLine } from './recipe-lines'
import type { RecipeLineDraft } from './recipe-lines'

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** Création d'un plat avec allergènes déclarés (ou explicitement non renseignés) et fiche recette légère. */
export function DishForm({ onSaved }: { onSaved: (dishId: Id<'dishes'>) => void }) {
  const { run, pending, error, setError } = useServerAction(useMutation(api.dishes.save))
  const [allergenStatus, setAllergenStatus] = useState<'unknown' | 'declared'>('unknown')
  const [portions, setPortions] = useState('1')
  const [lines, setLines] = useState<Array<RecipeLineDraft>>([newLine()])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (key: string) => String(data.get(key) ?? '')
    const filled = lines.filter((l) => l.ingredientId || l.unitId || l.quantity)
    const recipeLines = filled.flatMap(({ ingredientId, unitId, quantity }) => {
      const value = Number(quantity.replace(',', '.'))
      return ingredientId && unitId && value > 0 ? [{ ingredientId, unitId, quantity: value }] : []
    })
    if (recipeLines.length !== filled.length) {
      setError('Chaque ligne de recette doit avoir un ingrédient, une quantité positive et une unité.')
      return
    }
    const dishId = await run({
        dish: {
          name: text('name'),
          description: text('description'),
          defaultPriceXof: Number(text('price')),
          allergens:
            allergenStatus === 'unknown'
              ? { status: 'unknown' }
              : { status: 'declared', present: splitList(text('present')), traces: splitList(text('traces')) },
          recipe: {
            portions: Number(portions),
            lines: recipeLines,
          },
        },
    })
    if (dishId) onSaved(dishId)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nom du plat</FieldLabel>
          <Input id="name" name="name" required maxLength={80} placeholder="Attiéké poisson braisé" />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" rows={2} maxLength={300} />
        </Field>
        <Field>
          <FieldLabel htmlFor="price">Prix par défaut (FCFA)</FieldLabel>
          <Input id="price" name="price" inputMode="numeric" pattern="[0-9]*" required placeholder="1500" />
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>Allergènes</FieldLegend>
        <RadioGroup value={allergenStatus} onValueChange={(v) => setAllergenStatus(v as 'unknown' | 'declared')}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="allergens-unknown" />
            <Label htmlFor="allergens-unknown">Non renseignés (affiché comme inconnu)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="declared" id="allergens-declared" />
            <Label htmlFor="allergens-declared">Déclarés par la cuisine</Label>
          </div>
        </RadioGroup>
        {allergenStatus === 'declared' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="present">Contient</FieldLabel>
              <Input id="present" name="present" placeholder="Poisson, Arachide" />
            </Field>
            <Field>
              <FieldLabel htmlFor="traces">Traces possibles</FieldLabel>
              <Input id="traces" name="traces" placeholder="Gluten" />
              <FieldDescription>Séparez par des virgules. Laisser vide = aucun allergène déclaré.</FieldDescription>
            </Field>
          </FieldGroup>
        )}
      </FieldSet>

      <RecipeLines portions={portions} onPortionsChange={setPortions} lines={lines} onLinesChange={setLines} />

      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        Enregistrer le plat
      </Button>
    </form>
  )
}
