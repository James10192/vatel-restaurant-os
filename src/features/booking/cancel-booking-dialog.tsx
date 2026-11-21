import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
import { Spinner } from '#/components/ui/spinner'
import { formatXof } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

/** Annulation confirmée ; le remboursement est affiché seulement après réponse du serveur. */
export function CancelBookingDialog({
  bookingId,
  dishName,
  priceXof,
}: {
  bookingId: Id<'bookings'>
  dishName: string
  priceXof: number
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const { run, pending, error } = useServerAction(useMutation(api.bookings.cancel))
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('Annuler')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Annuler cette réservation ?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {dishName} : {formatXof(priceXof)} {t('seront recrédités sur votre solde.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('Garder')}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              if (await run({ bookingId })) setOpen(false)
            }}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {t('Annuler la réservation')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
