import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { SparklesIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Spinner } from '#/components/ui/spinner'
import { Textarea } from '#/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatDayShort } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import type { PublishedItem } from '#/features/menus/meal-card'
import { SuggestionResults } from './suggestion-results'

export type Suggestion = FunctionReturnType<typeof api.smartMenu.suggest>
type ServiceWish = 'any' | 'lunch' | 'dinner'

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const WISH_MAX = 200

/** Allergènes déclarés dans le menu affiché : choix proposés pour le filtre serveur. */
const declaredAllergens = (menu: Array<PublishedItem>) =>
  [...new Set(menu.flatMap(({ allergens: a }) => (a.status === 'declared' ? [...a.present, ...a.traces] : [])))].sort()

/**
 * Aide au choix (B1) : budget, jours, service et allergènes à éviter. Les règles serveur décident ;
 * l'IA, facultative, ne fait que choisir et expliquer parmi des plats vérifiés. Aucune réservation
 * automatique : chaque suggestion ouvre la confirmation habituelle.
 */
export function SmartMenuSheet({
  days,
  menu,
  balanceXof,
}: {
  days: Array<string>
  menu: Array<PublishedItem>
  balanceXof: number
}) {
  const allergens = declaredAllergens(menu)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Array<string>>([])
  const [service, setService] = useState<ServiceWish>('any')
  const [avoid, setAvoid] = useState<Array<string>>([])
  const [result, setResult] = useState<Suggestion | null>(null)
  const { run, pending, error } = useServerAction(useAction(api.smartMenu.suggest))
  const selected = picked.filter((day) => days.includes(day))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const suggestion = await run({
      days: selected,
      budgetXof: Number(form.get('budget')),
      service,
      avoid,
      wish: String(form.get('wish') ?? ''),
      useAi: true,
    })
    if (suggestion) setResult(suggestion)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full" disabled={days.length === 0}>
          <SparklesIcon data-icon="inline-start" />
          Aide au choix
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Aide au choix</SheetTitle>
          <SheetDescription>
            Indiquez vos jours et votre budget. Les prix, portions et allergènes viennent du menu publié. Rien n’est réservé
            sans votre confirmation.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <FieldGroup>
              <FieldSet>
                <FieldLegend variant="label">Jours</FieldLegend>
                <ToggleGroup type="multiple" variant="outline" value={selected} onValueChange={setPicked} className="flex-wrap">
                  {days.map((day) => (
                    <ToggleGroupItem key={day} value={day} aria-label={formatDayShort(day)} className="flex-col gap-0 px-3 py-6">
                      <span className="text-xs capitalize">{WEEKDAY.format(new Date(`${day}T00:00:00Z`))}</span>
                      <span className="text-sm font-semibold">{formatDayShort(day)}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>
              <Field>
                <FieldLabel htmlFor="smart-budget">Budget total (FCFA)</FieldLabel>
                <Input id="smart-budget" name="budget" inputMode="numeric" pattern="[0-9]*" required defaultValue="5000" />
              </Field>
              <FieldSet>
                <FieldLegend variant="label">Service</FieldLegend>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={service}
                  onValueChange={(value) => value && setService(value as ServiceWish)}
                >
                  <ToggleGroupItem value="any">Indifférent</ToggleGroupItem>
                  <ToggleGroupItem value="lunch">Déjeuner</ToggleGroupItem>
                  <ToggleGroupItem value="dinner">Dîner</ToggleGroupItem>
                </ToggleGroup>
              </FieldSet>
              {allergens.length > 0 && (
                <FieldSet>
                  <FieldLegend variant="label">Allergènes à éviter (facultatif)</FieldLegend>
                  <FieldDescription>Filtre appliqué par le serveur, jamais transmis à l’IA.</FieldDescription>
                  <ToggleGroup type="multiple" variant="outline" size="sm" value={avoid} onValueChange={setAvoid} className="flex-wrap">
                    {allergens.map((name) => (
                      <ToggleGroupItem key={name} value={name}>
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
              )}
              <Field>
                <FieldLabel htmlFor="smart-wish">Vos envies (facultatif)</FieldLabel>
                <Textarea id="smart-wish" name="wish" maxLength={WISH_MAX} rows={2} placeholder="Par exemple : plutôt du poisson, un plat copieux" />
                <FieldDescription>N’indiquez aucune information personnelle ou médicale.</FieldDescription>
              </Field>
            </FieldGroup>
            <FormError message={error} />
            <Button type="submit" disabled={pending || selected.length === 0}>
              {pending ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
              {pending ? 'Recherche en cours' : 'Proposer des repas'}
            </Button>
          </form>
          {result && <SuggestionResults result={result} balanceXof={balanceXof} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
