import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { CalendarCheckIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { BookablePick } from './use-live-picks'
import { FormError } from '#/components/form-error'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useLocale, useT } from '#/i18n/i18n'

/**
 * Une confirmation pour tous les repas encore réservables de la proposition. Le serveur réserve tout ou rien
 * (même contrôles qu'une réservation seule) ; la clé créée à l'ouverture évite tout double débit.
 */
export function BookPicksDialog({ picks, balanceXof }: { picks: Array<BookablePick>; balanceXof: number }) {
  const t = useT()
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const { run, pending, error, setError } = useServerAction(useMutation(api.bookings.bookMany))
  const total = picks.reduce((sum, p) => sum + p.priceXof, 0)
  const after = balanceXof - total
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setKey(crypto.randomUUID())
          setError(null)
        }
        setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="lg" className="w-full">
          <CalendarCheckIcon data-icon="inline-start" />
          {t('Réserver ces {n} repas', { n: picks.length })}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Confirmer {n} réservations', { n: picks.length })}</AlertDialogTitle>
          <AlertDialogDescription>{t('Tout est réservé, ou rien : si un repas n’est plus disponible, aucun débit n’est fait.')}</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col divide-y rounded-2xl border text-sm">
          {picks.map((pick) => (
            <li key={pick.menuItemId} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{pick.dishName}</span>
                <span className="text-xs text-muted-foreground first-letter:uppercase">
                  {formatDayLong(pick.date, locale)}, {t(SERVICE_LABELS[pick.service]).toLowerCase()}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatXof(pick.priceXof)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-y-1 text-sm tabular-nums">
          <dt className="text-muted-foreground">{t('Total')}</dt>
          <dd className="text-right font-semibold">{formatXof(total)}</dd>
          <dt className="text-muted-foreground">{t('Solde après réservation')}</dt>
          <dd className={after < 0 ? 'text-right font-semibold text-destructive' : 'text-right font-semibold'}>{formatXof(after)}</dd>
        </dl>
        {after < 0 && (
          <p className="text-sm">
            {t('Solde insuffisant pour tout réserver.')}{' '}
            <Link to="/app/wallet" className="font-semibold underline underline-offset-2">
              {t('Recharger mon compte')}
            </Link>
          </p>
        )}
        <Separator />
        <FormError message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('Retour')}</AlertDialogCancel>
          <Button
            disabled={pending || after < 0}
            onClick={async () => {
              if (await run({ menuItemIds: picks.map((p) => p.menuItemId), idempotencyKey: key })) setOpen(false)
            }}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {t('Confirmer et payer')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
