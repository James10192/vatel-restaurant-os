import type { FormEvent, ReactNode } from 'react'
import { SparklesIcon } from 'lucide-react'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '#/components/ui/input-group'
import { Spinner } from '#/components/ui/spinner'
import { Textarea } from '#/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatXof } from '#/lib/format'
import { cn } from '#/lib/utils'

export type ServiceWish = 'any' | 'lunch' | 'dinner'
export type SmartRequest = { days: Array<string>; budget: string; service: ServiceWish; avoid: Array<string>; wish: string }

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const DAY_NUMBER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' })
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const QUICK_BUDGETS = [2000, 4000, 6000, 10000]
export const WISH_MAX = 200
const SERVICES: Array<[ServiceWish, string]> = [
  ['any', 'Indifférent'],
  ['lunch', 'Déjeuner'],
  ['dinner', 'Dîner'],
]

/** Montant saisi : chiffres seulement (plus de « 5000 » qui se colle à la saisie), affiché avec séparateurs. */
export const budgetValue = (budget: string) => Number(budget || 0)

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {n}
        </span>
        <span className="font-semibold">{title}</span>
      </legend>
      {hint && <p className="-mt-1 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** Demande : jours (ceux sans menu sont grisés), budget contrôlé, service, allergènes à éviter, envies. */
export function SmartMenuForm({
  days,
  daysWithMenu,
  allergens,
  value,
  onChange,
  onSubmit,
  pending,
  error,
}: {
  days: Array<string>
  daysWithMenu: Set<string>
  allergens: Array<string>
  value: SmartRequest
  onChange: (patch: Partial<SmartRequest>) => void
  onSubmit: () => void
  pending: boolean
  error: string | null
}) {
  const budget = budgetValue(value.budget)
  const available = days.filter((d) => daysWithMenu.has(d))
  const missing = value.days.length === 0 ? 'Choisissez au moins un jour.' : budget <= 0 ? 'Indiquez un budget.' : null
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!missing) onSubmit()
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-4 pb-6 @container">
        <Step n={1} title="Vos jours" hint={available.length ? undefined : 'Aucun menu publié sur ces jours.'}>
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={2}
            aria-label="Jours"
            value={value.days}
            onValueChange={(next) => onChange({ days: next })}
            className="grid w-full grid-cols-4 @md:grid-cols-7"
          >
            {days.map((day) => (
              <ToggleGroupItem
                key={day}
                value={day}
                disabled={!daysWithMenu.has(day)}
                aria-label={`${WEEKDAY.format(toDate(day))} ${DAY_NUMBER.format(toDate(day))}${daysWithMenu.has(day) ? '' : ', pas de menu'}`}
                className="h-auto flex-col gap-0 rounded-2xl py-2.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <span className="text-xs capitalize opacity-80">{WEEKDAY.format(toDate(day)).replace('.', '')}</span>
                <span className="text-lg font-bold tabular-nums">{DAY_NUMBER.format(toDate(day))}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {available.length > 1 && (
            <Button type="button" variant="link" size="sm" className="h-auto self-start p-0" onClick={() => onChange({ days: available })}>
              Toute la semaine ({available.length} jours)
            </Button>
          )}
        </Step>

        <Step n={2} title="Votre budget total">
          <InputGroup className="h-12 rounded-2xl">
            <InputGroupInput
              id="smart-budget"
              aria-label="Budget total en FCFA"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Montant"
              className="text-lg font-semibold tabular-nums"
              value={value.budget ? Number(value.budget).toLocaleString('fr-FR') : ''}
              onChange={(e) => onChange({ budget: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>FCFA</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-wrap gap-2">
            {QUICK_BUDGETS.map((amount) => (
              <Button
                key={amount}
                type="button"
                size="sm"
                variant={budget === amount ? 'default' : 'outline'}
                aria-pressed={budget === amount}
                className={cn('rounded-full tabular-nums', budget === amount && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}
                onClick={() => onChange({ budget: String(amount) })}
              >
                {formatXof(amount)}
              </Button>
            ))}
          </div>
          {budget > 0 && value.days.length > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              Soit environ {formatXof(Math.floor(budget / value.days.length))} par jour.
            </p>
          )}
        </Step>

        <Step n={3} title="Service">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={value.service}
            onValueChange={(next) => next && onChange({ service: next as ServiceWish })}
            className="grid w-full grid-cols-3"
          >
            {SERVICES.map(([key, label]) => (
              <ToggleGroupItem key={key} value={key} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Step>

        {allergens.length > 0 && (
          <Step n={4} title="Allergènes à éviter" hint="Facultatif. Filtre appliqué par le serveur, jamais transmis à l’IA.">
            <ToggleGroup type="multiple" variant="outline" size="sm" spacing={2} value={value.avoid} onValueChange={(next) => onChange({ avoid: next })} className="flex-wrap justify-start">
              {allergens.map((name) => (
                <ToggleGroupItem key={name} value={name} className="rounded-full data-[state=on]:border-destructive data-[state=on]:text-destructive">
                  {name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Step>
        )}

        <Step n={allergens.length > 0 ? 5 : 4} title="Vos envies" hint="Facultatif. N’indiquez aucune information personnelle ou médicale.">
          <Textarea
            aria-label="Vos envies"
            maxLength={WISH_MAX}
            rows={2}
            value={value.wish}
            onChange={(e) => onChange({ wish: e.target.value })}
            placeholder="Par exemple : plutôt du poisson, un plat copieux"
          />
        </Step>
        <FormError message={error} />
      </div>

      <div className="flex flex-col gap-2 border-t bg-background/95 p-4 backdrop-blur">
        <Button type="submit" size="lg" disabled={pending || Boolean(missing)} className="w-full">
          {pending ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
          {pending ? 'Recherche en cours…' : 'Proposer des repas'}
        </Button>
        <p className="text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {missing ??
            `${value.days.length} jour${value.days.length > 1 ? 's' : ''} · ${formatXof(budget)} · rien n’est réservé sans votre confirmation`}
        </p>
      </div>
    </form>
  )
}
