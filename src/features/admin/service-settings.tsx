import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { Settings2Icon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Spinner } from '#/components/ui/spinner'
import { Switch } from '#/components/ui/switch'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

type Form = {
  lunch: string
  dinner: string
  cutoff: string
  capacityOn: boolean
  lunchCapacity: string
  dinnerCapacity: string
  slotsOn: boolean
  duration: string
  slotMinutes: string
  slotCapacity: string
}

const num = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN)

/**
 * Réglages du service (administration) : horaires, clôture, capacité globale par service et créneaux de retrait.
 * Le serveur valide tout (bornes, format) et n'enregistre jamais une politique partielle.
 */
export function ServiceSettings() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const { data: policy } = useQuery({ ...convexQuery(api.settings.policy, {}), enabled: open })
  const save = useServerAction(useMutation(api.settings.updatePolicy))
  const value: Form | null =
    form ??
    (policy
      ? {
          lunch: policy.serviceStart.lunch,
          dinner: policy.serviceStart.dinner,
          cutoff: String(policy.cutoffMinutes),
          capacityOn: Boolean(policy.serviceCapacity),
          lunchCapacity: String(policy.serviceCapacity?.lunch ?? 200),
          dinnerCapacity: String(policy.serviceCapacity?.dinner ?? 200),
          slotsOn: Boolean(policy.slots),
          duration: String(policy.slots?.durationMinutes ?? 90),
          slotMinutes: String(policy.slots?.slotMinutes ?? 15),
          slotCapacity: String(policy.slots?.slotCapacity ?? 40),
        }
      : null)
  const set = (patch: Partial<Form>) => value && setForm({ ...value, ...patch })
  const field = (key: keyof Form, label: string, props: { type?: string; hint?: string } = {}) =>
    value && (
      <Field>
        <FieldLabel htmlFor={`policy-${key}`}>{t(label)}</FieldLabel>
        <Input
          id={`policy-${key}`}
          type={props.type ?? 'text'}
          inputMode={props.type ? undefined : 'numeric'}
          value={String(value[key])}
          onChange={(e) => set({ [key]: e.target.value })}
          className="tabular-nums"
        />
        {props.hint && <FieldDescription>{t(props.hint)}</FieldDescription>}
      </Field>
    )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setForm(null)
        save.setError(null)
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline">
          <Settings2Icon data-icon="inline-start" />
          {t('Réglages du service')}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('Réglages du service')}</SheetTitle>
          <SheetDescription>{t('S’appliquent aux prochaines réservations ; celles déjà faites ne changent pas.')}</SheetDescription>
        </SheetHeader>
        {value && policy && (
          <form
            className="flex flex-col gap-6 px-4"
            onSubmit={async (e) => {
              e.preventDefault()
              const done = await save.run({
                policy: {
                  serviceStart: { lunch: value.lunch, dinner: value.dinner },
                  cutoffMinutes: num(value.cutoff),
                  demoTopUpMaxXof: policy.demoTopUpMaxXof,
                  serviceCapacity: value.capacityOn ? { lunch: num(value.lunchCapacity), dinner: num(value.dinnerCapacity) } : undefined,
                  slots: value.slotsOn ? { durationMinutes: num(value.duration), slotMinutes: num(value.slotMinutes), slotCapacity: num(value.slotCapacity) } : undefined,
                },
              })
              if (done !== undefined) setOpen(false)
            }}
          >
            <FieldSet>
              <FieldLegend>{t('Horaires')}</FieldLegend>
              <FieldGroup className="grid grid-cols-2 gap-3">
                {field('lunch', 'Début du déjeuner', { type: 'time' })}
                {field('dinner', 'Début du dîner', { type: 'time' })}
              </FieldGroup>
              {field('cutoff', 'Clôture (minutes avant le service)', { hint: 'Réservations, annulations et changements de créneau fermés ensuite.' })}
            </FieldSet>
            <FieldSet>
              <Field orientation="horizontal">
                <Switch id="policy-capacity" checked={value.capacityOn} onCheckedChange={(capacityOn) => set({ capacityOn })} />
                <FieldLabel htmlFor="policy-capacity">{t('Limiter le nombre de repas par service')}</FieldLabel>
              </Field>
              {value.capacityOn && (
                <FieldGroup className="grid grid-cols-2 gap-3">
                  {field('lunchCapacity', 'Déjeuner')}
                  {field('dinnerCapacity', 'Dîner')}
                </FieldGroup>
              )}
            </FieldSet>
            <FieldSet>
              <Field orientation="horizontal">
                <Switch id="policy-slots" checked={value.slotsOn} onCheckedChange={(slotsOn) => set({ slotsOn })} />
                <FieldLabel htmlFor="policy-slots">{t('Créneaux de retrait')}</FieldLabel>
              </Field>
              {value.slotsOn && (
                <FieldGroup className="grid grid-cols-3 gap-3">
                  {field('duration', 'Durée du service (min)')}
                  {field('slotMinutes', 'Créneau (min)')}
                  {field('slotCapacity', 'Repas par créneau')}
                </FieldGroup>
              )}
            </FieldSet>
            <FormError message={save.error} />
            <SheetFooter className="px-0">
              <Button type="submit" disabled={save.pending}>
                {save.pending && <Spinner data-icon="inline-start" />}
                {t('Enregistrer les réglages')}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
