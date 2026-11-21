import { useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { materialsFor, simulate, validateInputs } from '../../../convex/lib/production/plan'
import type { Baseline, FieldIssue } from '../../../convex/lib/production/plan'
import { CountField, parseCount } from './count-field'
import { SimulationResult } from './simulation-result'
import { baselineOf } from './types'
import type { ProductionOffer } from './types'
import { Alert, AlertAction, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { FieldGroup, FieldLegend, FieldSet } from '#/components/ui/field'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { useMinWidth } from '#/lib/use-min-width'
import { useT } from '#/i18n/i18n'

const FIELDS = ['walkIns', 'margin', 'preparedAssumed', 'cancellations', 'arrivals'] as const
type Inputs = Record<(typeof FIELDS)[number], string>
const EMPTY: Inputs = { walkIns: '0', margin: '0', preparedAssumed: '0', cancellations: '0', arrivals: '0' }

const sameBaseline = (a: Baseline, b: Baseline) =>
  a.capacity === b.capacity && a.confirmed === b.confirmed && a.pickedUp === b.pickedUp && a.prepared === b.prepared

/**
 * « Simuler un imprévu » : lecture seule, aucune donnée écrite. Les chiffres de départ sont figés à l'ouverture ;
 * si les réservations changent pendant la saisie, on le signale et on propose de recalculer, sans écraser la saisie.
 */
export function SimulateSheet({ offer, trigger }: { offer: ProductionOffer; trigger: React.ReactNode }) {
  const t = useT()
  const wide = useMinWidth(768)
  const live = baselineOf(offer)
  const [open, setOpen] = useState(false)
  const [frozen, setFrozen] = useState(live)
  const [inputs, setInputs] = useState(EMPTY)
  const stale = open && !sameBaseline(frozen, live)

  const values = Object.fromEntries(FIELDS.map((f) => [f, parseCount(inputs[f])])) as Record<keyof Inputs, number>
  const assumptions = { walkIns: values.walkIns, margin: values.margin, preparedAssumed: frozen.prepared === null ? values.preparedAssumed : 0 }
  const scenario = { cancellations: values.cancellations, arrivals: values.arrivals }
  const issues = validateInputs(frozen, assumptions, scenario)
  const errorOf = (field: FieldIssue['field']) => issues.find((i) => i.field === field)?.message
  const result = issues.length === 0 ? simulate(frozen, assumptions, scenario) : null
  const delta = result ? Math.max(result.avoidable, result.extra) : 0

  const field = (name: keyof Inputs, label: string, hint?: string) => (
    <CountField
      id={`sim-${name}`}
      label={label}
      hint={hint}
      value={inputs[name]}
      onChange={(value) => setInputs((prev) => ({ ...prev, [name]: value }))}
      error={errorOf(name) && t(errorOf(name) ?? '', { n: frozen.confirmed })}
    />
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setFrozen(live)
          // Hypothèses du plan validé, s'il existe : la simulation part de la décision du chef.
          setInputs({ ...EMPTY, walkIns: String(offer.plan?.walkIns ?? 0), margin: String(offer.plan?.margin ?? 0) })
        }
        setOpen(next)
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className="max-h-[92dvh] overflow-y-auto data-[side=bottom]:rounded-t-3xl data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{t('Simuler un imprévu')}</SheetTitle>
          <SheetDescription>
            {offer.dishName}. {t('Simulation : aucune réservation, aucun solde ni stock n’est modifié.')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {stale && (
            <Alert>
              <RefreshCwIcon />
              <AlertDescription>{t('Les réservations ont changé depuis l’ouverture.')}</AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={() => setFrozen(live)}>
                  {t('Recalculer')}
                </Button>
              </AlertAction>
            </Alert>
          )}
          <FieldSet>
            <FieldLegend>{t('Imprévu')}</FieldLegend>
            <FieldGroup className="grid grid-cols-2 gap-3">
              {field('cancellations', t('Absents ou annulations'), t('Au plus {n}', { n: frozen.confirmed }))}
              {field('arrivals', t('Arrivées en plus'))}
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>{t('Hypothèses du chef')}</FieldLegend>
            <FieldGroup className="grid grid-cols-2 gap-3">
              {field('walkIns', t('Passages sans réservation'))}
              {field('margin', t('Marge de sécurité'))}
              {frozen.prepared === null &&
                field('preparedAssumed', t('Préparé (hypothèse)'), t('Aucune saisie de cuisine : valeur supposée.'))}
            </FieldGroup>
          </FieldSet>
          {result && (
            <SimulationResult result={result} materials={materialsFor(offer.recipe, delta)} capacity={frozen.capacity} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
