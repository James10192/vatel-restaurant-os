import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MAX_EVENT_PORTIONS } from '../../../convex/lib/production/waste'
import { CountField, parseCount } from './count-field'
import { newRequestKey } from './types'
import type { ProductionOffer } from './types'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX_EVENT_PORTIONS

/**
 * Valider l'objectif d'une offre : réservations (réelles) + passages sans réservation + marge (hypothèses du chef).
 * L'historique du plat et une marge par règles aident à décider ; rien n'est appliqué sans « Valider ».
 */
export function PlanDialog({ offer, trigger }: { offer: ProductionOffer; trigger: React.ReactNode }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [walkIns, setWalkIns] = useState('0')
  const [margin, setMargin] = useState('0')
  const [key, setKey] = useState(newRequestKey)
  const action = useServerAction(useMutation(api.productionPlan.validatePlan))
  const { data } = useQuery({ ...convexQuery(api.productionPlan.dishHistory, { menuItemId: offer.menuItemId }), enabled: open })
  const booked = offer.confirmed + offer.pickedUp
  const values = { walkIns: parseCount(walkIns), margin: parseCount(margin) }
  const ok = valid(values.walkIns) && valid(values.margin)
  const target = ok ? booked + values.walkIns + values.margin : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) return
        setKey(newRequestKey())
        action.setError(null)
        setWalkIns(String(offer.plan?.walkIns ?? 0))
        setMargin(String(offer.plan?.margin ?? ''))
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!ok) return
            const done = await action.run({ menuItemId: offer.menuItemId, ...values, idempotencyKey: key })
            if (done !== undefined) setOpen(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Objectif de préparation')}</DialogTitle>
            <DialogDescription>{offer.dishName}</DialogDescription>
          </DialogHeader>

          <section className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-3 text-sm">
            <h3 className="font-semibold">{t('Historique de ce plat')}</h3>
            {!data ? (
              <Skeleton className="h-10" />
            ) : data.history.services === 0 ? (
              <p className="text-muted-foreground">{t('Premier service de ce plat : aucun historique.')}</p>
            ) : (
              <p className="text-muted-foreground tabular-nums">
                {t('{n} services passés : {avg} réservations en moyenne, {pickup} % retirées, {noShow} % d’absents, {waste} % de pertes.', {
                  n: data.history.services,
                  avg: data.history.avgBooked ?? '?',
                  pickup: data.history.pickupRate ?? '?',
                  noShow: data.history.noShowRate ?? '?',
                  waste: data.history.wasteRate ?? '?',
                })}
              </p>
            )}
            {data && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {data.suggestion.coldStart
                    ? t('Démarrage à froid : aucun passage supposé, marge par défaut de 5 % des réservations.')
                    : t('Proposition : {walkIns} passages (moyenne mesurée au comptoir), marge de 5 % ; environ {n} absents attendus.', {
                        walkIns: data.suggestion.walkIns,
                        n: data.suggestion.expectedNoShows,
                      })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWalkIns(String(data.suggestion.walkIns))
                    setMargin(String(data.suggestion.margin))
                  }}
                >
                  {t('Appliquer la proposition')}
                </Button>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <CountField id="plan-walkins" label={t('Passages sans réservation')} value={walkIns} onChange={setWalkIns} error={valid(values.walkIns) ? undefined : 'Nombre entier positif attendu.'} />
            <CountField id="plan-margin" label={t('Marge de sécurité')} value={margin} onChange={setMargin} error={margin === '' || valid(values.margin) ? undefined : 'Nombre entier positif attendu.'} />
          </div>

          <p className="text-sm tabular-nums" aria-live="polite">
            {target === null
              ? t('Complétez les deux valeurs.')
              : t('Objectif : {target} portions ({booked} réservées, {walkIns} sans réservation, {margin} de marge).', {
                  target,
                  booked,
                  walkIns: values.walkIns,
                  margin: values.margin,
                })}
            {target !== null && target > offer.capacity && (
              <span className="block text-destructive">{t('Au-delà de la capacité ({n}) : rien n’est promis au-delà.', { n: offer.capacity })}</span>
            )}
          </p>
          <FormError message={action.error} />
          <DialogFooter>
            <Button type="submit" disabled={action.pending || !ok}>
              {action.pending && <Spinner data-icon="inline-start" />}
              {t('Valider l’objectif')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
