import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ShieldAlertIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '../../../convex/lib/allergens'
import { FormError } from '#/components/form-error'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { Textarea } from '#/components/ui/textarea'
import { useServerAction } from '#/lib/server-action'
import { RecipeLines, newLine, parseNumber } from './recipe-lines'
import type { RecipeLineDraft } from './recipe-lines'
import { useT } from '#/i18n/i18n'

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toDrafts = (dish?: Doc<'dishes'>): Array<RecipeLineDraft> =>
  dish?.recipe.lines.length
    ? dish.recipe.lines.map((l) => ({
        key: crypto.randomUUID(),
        ingredientId: l.ingredientId,
        unitId: l.unitId,
        quantity: String(l.quantity),
        lossPct: l.lossPct ? String(l.lossPct) : '',
      }))
    : [newLine()]

/**
 * Fiche d'un plat : création, modification (`dishId`) ou nouvelle version (`initial` sans `dishId`).
 * Les allergènes viennent des ingrédients de la fiche (calcul serveur, aperçu ici) ; les mentions manuelles complètent.
 */
export function DishForm({
  onSaved,
  initial,
  dishId,
  submitLabel = 'Enregistrer le plat',
}: {
  onSaved: (dishId: Id<'dishes'>) => void
  initial?: Doc<'dishes'>
  dishId?: Id<'dishes'>
  submitLabel?: string
}) {
  const t = useT()
  const { run, pending, error, setError } = useServerAction(useMutation(api.dishes.save))
  const { data: refs } = useQuery(convexQuery(api.catalog.references, {}))
  const [portions, setPortions] = useState(String(initial?.recipe.portions ?? 1))
  const [lines, setLines] = useState(() => toDrafts(initial))
  const manual = initial?.allergens.status === 'declared' ? initial.allergens : undefined

  // Aperçu de la déduction serveur : mêmes règles (un ingrédient non renseigné rend le plat non renseigné).
  const used = lines.flatMap((l) => (l.ingredientId ? [refs?.ingredients.find((i) => i._id === l.ingredientId)] : []))
  const missing = used.filter((i) => i && i.allergens === undefined).map((i) => i?.name)
  const codes = new Set(used.flatMap((i) => i?.allergens ?? []))
  const derived = ALLERGEN_CODES.filter((c) => codes.has(c)).map((c) => t(ALLERGEN_LABELS[c]))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (key: string) => String(data.get(key) ?? '')
    const filled = lines.filter((l) => l.ingredientId || l.unitId || l.quantity)
    const recipeLines = filled.flatMap(({ ingredientId, unitId, quantity, lossPct }) => {
      const value = parseNumber(quantity)
      const loss = lossPct ? parseNumber(lossPct) : undefined
      return ingredientId && unitId && value > 0 ? [{ ingredientId, unitId, quantity: value, lossPct: loss }] : []
    })
    if (recipeLines.length !== filled.length) {
      setError(t('Chaque ligne de recette doit avoir un ingrédient, une quantité positive et une unité.'))
      return
    }
    const present = splitList(text('present'))
    const traces = splitList(text('traces'))
    const saved = await run({
      dishId,
      dish: {
        name: text('name'),
        description: text('description'),
        defaultPriceXof: Number(text('price')),
        // Sans fiche ni mention : « non renseignés ». Avec fiche : le serveur déduit et ajoute ces mentions.
        allergens: present.length || traces.length || recipeLines.length ? { status: 'declared', present, traces } : { status: 'unknown' },
        recipe: { portions: Number(portions), lines: recipeLines },
      },
    })
    if (saved) onSaved(saved)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup className="@container">
        <Field>
          <FieldLabel htmlFor="name">{t('Nom du plat')}</FieldLabel>
          <Input id="name" name="name" required maxLength={80} defaultValue={initial?.name} placeholder={t('Attiéké poisson braisé')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">{t('Description')}</FieldLabel>
          <Textarea id="description" name="description" rows={2} maxLength={300} defaultValue={initial?.description} />
        </Field>
        <Field className="@md:max-w-56">
          <FieldLabel htmlFor="price">{t('Prix par défaut (FCFA)')}</FieldLabel>
          <Input id="price" name="price" inputMode="numeric" pattern="[0-9]*" required defaultValue={initial?.defaultPriceXof} placeholder="1500" />
        </Field>
      </FieldGroup>

      <RecipeLines portions={portions} onPortionsChange={setPortions} lines={lines} onLinesChange={setLines} />

      <FieldSet>
        <FieldLegend>{t('Allergènes')}</FieldLegend>
        {used.length === 0 ? (
          <FieldDescription>{t('Ajoutez les ingrédients : les allergènes du plat seront déduits de leurs fiches.')}</FieldDescription>
        ) : missing.length > 0 ? (
          <Alert>
            <ShieldAlertIcon />
            <AlertTitle>{t('Plat affiché « allergènes non renseignés »')}</AlertTitle>
            <AlertDescription>{t('À compléter dans l’onglet Ingrédients :')} {missing.join(', ')}.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('Déduits des ingrédients :')}</span>
            {derived.length ? derived.map((label) => <Badge key={label}>{t(label)}</Badge>) : <Badge variant="outline">{t('Aucun allergène majeur')}</Badge>}
          </div>
        )}
        <FieldGroup className="grid gap-4 @md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="present">{t('Mentions complémentaires')}</FieldLabel>
            <Input id="present" name="present" defaultValue={manual?.present.join(', ')} placeholder={t('Garniture hors fiche')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="traces">{t('Traces possibles')}</FieldLabel>
            <Input id="traces" name="traces" defaultValue={manual?.traces.join(', ')} placeholder={t('Sésame')} />
          </Field>
        </FieldGroup>
        <FieldDescription>{t('Séparez par des virgules. Ces mentions s’ajoutent à la déduction, elles ne la remplacent pas.')}</FieldDescription>
      </FieldSet>

      <FormError message={error} />
      <Button type="submit" disabled={pending} className="@md:self-start">
        {pending && <Spinner data-icon="inline-start" />}
        {t(submitLabel)}
      </Button>
    </form>
  )
}
