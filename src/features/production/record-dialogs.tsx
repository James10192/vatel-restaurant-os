import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MAX_EVENT_PORTIONS, WASTE_REASONS, WASTE_REASON_LABELS } from '../../../convex/lib/production/waste'
import type { WasteReason } from '../../../convex/lib/production/waste'
import { CountField, parseCount } from './count-field'
import type { ProductionOffer } from './types'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Spinner } from '#/components/ui/spinner'
import { Switch } from '#/components/ui/switch'
import { useEntryDialog } from '#/lib/use-entry-dialog'
import { useT } from '#/i18n/i18n'

type Props = { offer: ProductionOffer; trigger: React.ReactNode }

const RANGE = `Entier entre 1 et ${MAX_EVENT_PORTIONS}.`

const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_EVENT_PORTIONS

/** Ajout de portions sorties de cuisine, ou correction (retrait) signalée. Le total affiché vient du serveur. */
export function RecordPreparedDialog({ offer, trigger }: Props) {
  const t = useT()
  const [value, setValue] = useState('')
  const [correction, setCorrection] = useState(false)
  const { open, setOpen, onOpenChange, key, action } = useEntryDialog(useMutation(api.production.recordPrepared), () => {
    setValue('')
    setCorrection(false)
  })
  const count = parseCount(value)
  const invalid = value !== '' && !inRange(count)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!inRange(count)) return
            const done = await action.run({ menuItemId: offer.menuItemId, portions: correction ? -count : count, idempotencyKey: key })
            if (done) setOpen(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Portions préparées')}</DialogTitle>
            <DialogDescription>
              {offer.dishName} : {t('déjà saisi {n}', { n: offer.prepared ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <CountField
            id="prepared-count"
            label={correction ? t('Portions à retirer du total') : t('Portions qui viennent de sortir')}
            value={value}
            onChange={setValue}
            min={1}
            error={invalid ? RANGE : undefined}
          />
          <Field orientation="horizontal">
            <Switch id="prepared-correction" checked={correction} onCheckedChange={setCorrection} />
            <FieldLabel htmlFor="prepared-correction">{t('Corriger une erreur de saisie')}</FieldLabel>
          </Field>
          <FormError message={action.error} />
          <DialogFooter>
            <Button type="submit" disabled={action.pending || !inRange(count)}>
              {action.pending && <Spinner data-icon="inline-start" />}
              {correction ? t('Retirer du total') : t('Ajouter au total')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Perte réelle avec motif. Plafond indiqué d'avance ; le serveur revérifie. */
export function DeclareWasteDialog({ offer, trigger, max }: Props & { max: number }) {
  const t = useT()
  const [value, setValue] = useState('')
  const [reason, setReason] = useState<WasteReason>('surplus')
  const { open, setOpen, onOpenChange, key, action } = useEntryDialog(useMutation(api.production.recordWaste), () => setValue(''))
  const count = parseCount(value)
  const valid = inRange(count) && count <= max
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!valid) return
            const done = await action.run({ menuItemId: offer.menuItemId, portions: count, reason, idempotencyKey: key })
            if (done !== undefined) setOpen(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Déclarer une perte')}</DialogTitle>
            <DialogDescription>{t('Portions réellement jetées ou retirées, comptées une seule fois.')}</DialogDescription>
          </DialogHeader>
          <CountField
            id="waste-count"
            label={t('Portions perdues')}
            value={value}
            onChange={setValue}
            min={1}
            hint={t('Au plus {n} (préparé moins remis moins déjà déclaré).', { n: max })}
            error={value !== '' && !valid ? t('Au plus {n} (préparé moins remis moins déjà déclaré).', { n: max }) : undefined}
          />
          <Field>
            <FieldLabel htmlFor="waste-reason">{t('Motif')}</FieldLabel>
            <NativeSelect id="waste-reason" value={reason} onChange={(e) => setReason(e.target.value as WasteReason)}>
              {WASTE_REASONS.map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {t(WASTE_REASON_LABELS[r])}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <FormError message={action.error} />
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={action.pending || !valid}>
              {action.pending && <Spinner data-icon="inline-start" />}
              {t('Déclarer la perte')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Surplus récupéré (#6) : portions encore sûres, redistribuées après contrôle du chef. Le contrôle est une
 * déclaration humaine obligatoire ; l'application ne garantit jamais la sécurité d'un plat.
 */
export function RecoverDialog({ offer, trigger, max }: Props & { max: number }) {
  const t = useT()
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const { open, setOpen, onOpenChange, key, action } = useEntryDialog(useMutation(api.production.recordRecovered), () => {
    setValue('')
    setChecked(false)
  })
  const count = parseCount(value)
  const valid = inRange(count) && count <= max && checked
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!valid) return
            const done = await action.run({ menuItemId: offer.menuItemId, portions: count, hygieneChecked: checked, idempotencyKey: key })
            if (done !== undefined) setOpen(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Surplus récupéré')}</DialogTitle>
            <DialogDescription>{t('Portions encore sûres, redistribuées (personnel, association) : ni vendues, ni perdues.')}</DialogDescription>
          </DialogHeader>
          <CountField
            id="recover-count"
            label={t('Portions récupérées')}
            value={value}
            onChange={setValue}
            min={1}
            hint={t('Au plus {n} (préparé moins remis moins déjà déclaré).', { n: max })}
            error={value !== '' && !(inRange(count) && count <= max) ? t('Au plus {n} (préparé moins remis moins déjà déclaré).', { n: max }) : undefined}
          />
          <Field orientation="horizontal">
            <Switch id="recover-hygiene" checked={checked} onCheckedChange={setChecked} />
            <FieldLabel htmlFor="recover-hygiene">{t('Le chef a vérifié la conservation et l’hygiène de ces portions.')}</FieldLabel>
          </Field>
          <FormError message={action.error} />
          <DialogFooter>
            <Button type="submit" disabled={action.pending || !valid}>
              {action.pending && <Spinner data-icon="inline-start" />}
              {t('Enregistrer le surplus récupéré')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
