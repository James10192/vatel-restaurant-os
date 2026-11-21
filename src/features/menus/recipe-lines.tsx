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
import { useT } from '#/i18n/i18n'

export type RecipeLineDraft = {
  key: string
  ingredientId?: Id<'ingredients'>
  quantity: string
  unitId?: Id<'units'>
  /** Perte à la préparation en % (épluchage, parage, cuisson). Vide = 0. */
  lossPct: string
}

export const newLine = (): RecipeLineDraft => ({ key: crypto.randomUUID(), quantity: '', lossPct: '' })

export const parseNumber = (value: string) => Number(value.replace(',', '.'))
const format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

/** Quantité nette par portion : brute x (1 - perte) / portions. Rien si la saisie est incomplète. */
function netPerPortion(line: RecipeLineDraft, portions: string): string | null {
  const quantity = parseNumber(line.quantity)
  const loss = line.lossPct ? parseNumber(line.lossPct) : 0
  const count = parseNumber(portions)
  if (!(quantity > 0) || !(count >= 1) || !(loss >= 0 && loss < 100)) return null
  return format.format((quantity * (1 - loss / 100)) / count)
}

/**
 * Lignes ingrédient | quantité brute | unité | perte, avec création d'ingrédient et d'unité sans quitter la fiche.
 * Container query : une ligne sur large zone, deux rangées sur mobile.
 */
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
  const t = useT()
  const { data: refs } = useQuery(convexQuery(api.catalog.references, {}))
  const createIngredient = useMutation(api.catalog.createIngredient)
  const createUnit = useMutation(api.catalog.createUnit)
  const update = (key: string, patch: Partial<RecipeLineDraft>) =>
    onLinesChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  const unitName = (id?: Id<'units'>) => refs?.units.find((u) => u._id === id)?.name ?? ''

  return (
    <FieldSet className="@container">
      <FieldLegend>{t('Fiche recette')}</FieldLegend>
      <Field orientation="horizontal" className="w-fit">
        <FieldLabel htmlFor="portions">{t('Pour')}</FieldLabel>
        <Input id="portions" inputMode="numeric" className="w-20" value={portions} onChange={(e) => onPortionsChange(e.target.value)} />
        <span className="text-sm text-muted-foreground">{t('portions')}</span>
      </Field>
      <div className="flex flex-col gap-3">
        {lines.map((line) => {
          const net = netPerPortion(line, portions)
          return (
            <div key={line.key} className="flex flex-col gap-1 rounded-2xl border bg-muted/30 p-2 @xl:border-0 @xl:bg-transparent @xl:p-0">
              <div className="grid grid-cols-[1fr_auto] gap-2 @xl:grid-cols-[minmax(0,1fr)_5rem_minmax(0,9rem)_5.5rem_auto] @xl:items-center">
                <div className="@xl:contents">
                  <CreatableCombobox
                    label={t('Ingrédient')}
                    placeholder={t('Ingrédient')}
                    options={refs?.ingredients ?? []}
                    value={line.ingredientId}
                    onChange={(id) => update(line.key, { ingredientId: id as Id<'ingredients'> })}
                    onCreate={(name) => createIngredient({ name })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('Retirer la ligne')}
                  className="@xl:order-last"
                  onClick={() => onLinesChange(lines.filter((l) => l.key !== line.key))}
                >
                  <Trash2Icon />
                </Button>
                <div className="col-span-2 grid grid-cols-[5rem_minmax(0,1fr)_5.5rem] gap-2 @xl:contents">
                  <Input
                    aria-label={t('Quantité brute')}
                    inputMode="decimal"
                    placeholder={t('Qté')}
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: e.target.value })}
                  />
                  <CreatableCombobox
                    label={t('Unité')}
                    placeholder={t('Unité')}
                    options={refs?.units ?? []}
                    value={line.unitId}
                    onChange={(id) => update(line.key, { unitId: id as Id<'units'> })}
                    onCreate={(name) => createUnit({ name })}
                  />
                  <div className="relative">
                    <Input
                      aria-label={t('Perte à la préparation en pourcentage')}
                      inputMode="decimal"
                      placeholder={t('Perte')}
                      className="pr-7"
                      value={line.lossPct}
                      onChange={(e) => update(line.key, { lossPct: e.target.value })}
                    />
                    <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
              {net && (
                <p className="px-1 text-xs text-muted-foreground tabular-nums">
                  {t('Net par portion :')} {net} {unitName(line.unitId)}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onLinesChange([...lines, newLine()])}>
        <PlusIcon data-icon="inline-start" />
        {t('Ajouter un ingrédient')}
      </Button>
      <FieldDescription>
        {t('Quantité brute (avant épluchage ou cuisson) et perte à la préparation : le net par portion est calculé. Ingrédient ou unité absent : tapez son nom puis « Créer », la fiche reste intacte.')}
      </FieldDescription>
    </FieldSet>
  )
}
