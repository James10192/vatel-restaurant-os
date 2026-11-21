import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CreatableCombobox } from '#/components/creatable-combobox'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Spinner } from '#/components/ui/spinner'
import { useEntryDialog } from '#/lib/use-entry-dialog'
import { useT } from '#/i18n/i18n'

export type MovementKind = 'reception' | 'count' | 'loss'
type LossReason = 'expired' | 'damaged' | 'other'

const COPY: Record<MovementKind, { title: string; description: string; quantity: string; submit: string }> = {
  reception: { title: 'Réception', description: 'Marchandise reçue : elle entre dans le stock.', quantity: 'Quantité reçue', submit: 'Enregistrer la réception' },
  count: { title: 'Inventaire', description: 'Quantité comptée en réserve : elle devient le nouveau point de départ, l’écart reste tracé.', quantity: 'Quantité comptée', submit: 'Enregistrer l’inventaire' },
  loss: { title: 'Perte de matière', description: 'Matière jetée avant préparation (périmée, abîmée).', quantity: 'Quantité perdue', submit: 'Enregistrer la perte' },
}
export const LOSS_REASONS: Record<LossReason, string> = { expired: 'Date limite dépassée', damaged: 'Abîmé', other: 'Autre' }

/** « 2,5 » ou « 2.5 » -> 2.5 ; vide ou texte -> NaN (refusé, jamais arrondi). */
const parseDecimal = (value: string) => (/^\d+([.,]\d+)?$/.test(value.trim()) ? Number(value.replace(',', '.')) : Number.NaN)
const parseInteger = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN)

/**
 * Saisie d'un mouvement de stock. Ingrédient et unité se choisissent ou se créent sur place (sans perdre la saisie).
 * Une clé d'idempotence par ouverture : un double envoi n'enregistre qu'une fois.
 */
export function MovementDialog({ kind, trigger, ingredientId }: { kind: MovementKind; trigger: React.ReactNode; ingredientId?: Id<'ingredients'> }) {
  const t = useT()
  const copy = COPY[kind]
  const empty = { ingredientId: ingredientId ?? '', unitId: '', quantity: '', lotCode: '', expiresOn: '', supplier: '', unitCost: '', reason: 'expired' as LossReason }
  const [form, setForm] = useState(empty)
  const actions = { reception: useMutation(api.stock.receive), count: useMutation(api.stock.count), loss: useMutation(api.stock.lose) }
  // La clé d'idempotence (une par ouverture) est passée à l'envoi.
  const submit = async (key: string) => {
    const base = { ingredientId: form.ingredientId as Id<'ingredients'>, unitId: form.unitId as Id<'units'>, quantity: parseDecimal(form.quantity), idempotencyKey: key }
    if (kind === 'reception')
      return await actions.reception({
        ...base,
        lotCode: form.lotCode || undefined,
        expiresOn: form.expiresOn || undefined,
        supplier: form.supplier || undefined,
        unitCostXof: form.unitCost ? parseInteger(form.unitCost) : undefined,
      })
    if (kind === 'count') return await actions.count(base)
    return await actions.loss({ ...base, reason: form.reason })
  }
  const { open, setOpen, onOpenChange, key, action } = useEntryDialog(submit, () => setForm(empty))
  const { data: refs } = useQuery({ ...convexQuery(api.catalog.references, {}), enabled: open })
  const createIngredient = useMutation(api.catalog.createIngredient)
  const createUnit = useMutation(api.catalog.createUnit)
  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))
  const quantity = parseDecimal(form.quantity)
  const costOk = !form.unitCost || Number.isInteger(parseInteger(form.unitCost))
  const ready = form.ingredientId && form.unitId && Number.isFinite(quantity) && (kind === 'count' || quantity > 0) && costOk

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!ready) return
            if ((await action.run(key)) !== undefined) setOpen(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(copy.title)}</DialogTitle>
            <DialogDescription>{t(copy.description)}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t('Ingrédient')}</FieldLabel>
            <CreatableCombobox
              label={t('Ingrédient')}
              placeholder={t('Choisir ou créer')}
              options={refs?.ingredients ?? []}
              value={form.ingredientId || undefined}
              onChange={(id) => set({ ingredientId: id })}
              onCreate={(name) => createIngredient({ name })}
            />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
            <Field>
              <FieldLabel htmlFor="movement-quantity">{t(copy.quantity)}</FieldLabel>
              <Input id="movement-quantity" inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} className="tabular-nums" />
            </Field>
            <Field>
              <FieldLabel>{t('Unité')}</FieldLabel>
              <CreatableCombobox
                label={t('Unité')}
                placeholder={t('Unité')}
                options={refs?.units ?? []}
                value={form.unitId || undefined}
                onChange={(id) => set({ unitId: id })}
                onCreate={(name) => createUnit({ name })}
              />
            </Field>
          </div>
          {kind === 'reception' && (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="movement-lot">{t('Lot')}</FieldLabel>
                <Input id="movement-lot" maxLength={80} value={form.lotCode} onChange={(e) => set({ lotCode: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="movement-dlc">{t('Date limite')}</FieldLabel>
                <Input id="movement-dlc" type="date" value={form.expiresOn} onChange={(e) => set({ expiresOn: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="movement-supplier">{t('Fournisseur')}</FieldLabel>
                <Input id="movement-supplier" maxLength={80} value={form.supplier} onChange={(e) => set({ supplier: e.target.value })} />
              </Field>
              <Field data-invalid={!costOk}>
                <FieldLabel htmlFor="movement-cost">{t('Prix par unité (FCFA)')}</FieldLabel>
                <Input id="movement-cost" inputMode="numeric" value={form.unitCost} onChange={(e) => set({ unitCost: e.target.value })} aria-invalid={!costOk} className="tabular-nums" />
                <FieldDescription>{t('Facultatif. Sert aux coûts estimés.')}</FieldDescription>
              </Field>
            </div>
          )}
          {kind === 'loss' && (
            <Field>
              <FieldLabel htmlFor="movement-reason">{t('Motif')}</FieldLabel>
              <NativeSelect id="movement-reason" value={form.reason} onChange={(e) => set({ reason: e.target.value as LossReason })}>
                {(Object.keys(LOSS_REASONS) as Array<LossReason>).map((reason) => (
                  <NativeSelectOption key={reason} value={reason}>
                    {t(LOSS_REASONS[reason])}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
          <FormError message={action.error} />
          <DialogFooter>
            <Button type="submit" disabled={action.pending || !ready}>
              {action.pending && <Spinner data-icon="inline-start" />}
              {t(copy.submit)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
