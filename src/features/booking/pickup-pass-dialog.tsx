import { useState } from 'react'
import { useMutation } from 'convex/react'
import { CircleCheckIcon, QrCodeIcon, RefreshCwIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { formatCode } from '../../../convex/lib/pass'
import { FormError } from '#/components/form-error'
import { QrCode } from '#/components/qr-code'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayLong } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useLocale, useT } from '#/i18n/i18n'

type Booking = { _id: Id<'bookings'>; dishName: string; date: string; service: Service; status: 'confirmed' | 'picked_up' | 'cancelled' }

/**
 * QR de retrait. Le code est émis à l'ouverture et n'existe qu'en mémoire (jamais stocké sur l'appareil) ;
 * rouvrir en émet un nouveau et invalide l'ancien.
 *
 * La fenêtre est tenue au niveau de la liste (`usePickupPass`), pas dans la carte : quand le comptoir valide
 * la remise, la réservation change de section en direct et sa carte est remplacée ; la fenêtre, elle, reste
 * ouverte et affiche « Repas remis ».
 */
export function usePickupPass(bookings: Array<Booking> | undefined) {
  const t = useT()
  const [openId, setOpenId] = useState<Id<'bookings'> | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const issue = useServerAction(useMutation(api.passes.issue))
  const booking = bookings?.find((b) => b._id === openId)
  const show = async (bookingId: Id<'bookings'>) => {
    setOpenId(bookingId)
    setCode(null)
    const result = await issue.run({ bookingId })
    if (result) setCode(result.code)
  }
  const trigger = (target: Booking, size: 'sm' | 'default' = 'sm') => (
    <Button size={size} variant="outline" onClick={() => void show(target._id)}>
      <QrCodeIcon data-icon="inline-start" />
      {t('QR de retrait')}
    </Button>
  )
  const dialog = booking ? (
    <PickupPassDialog
      booking={booking}
      code={code}
      error={issue.error}
      pending={issue.pending}
      onRenew={() => void show(booking._id)}
      onClose={() => {
        setOpenId(null)
        setCode(null)
      }}
    />
  ) : null
  return { trigger, dialog }
}

type DialogProps = { booking: Booking; code: string | null; error: string | null; pending: boolean; onRenew: () => void; onClose: () => void }

function PickupPassDialog({ booking, code, error, pending, onRenew, onClose }: DialogProps) {
  const t = useT()
  const { locale } = useLocale()
  const served = booking.status === 'picked_up'
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{booking.dishName}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatDayLong(booking.date, locale)}, {t(SERVICE_LABELS[booking.service]).toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        {served ? (
          <div role="status" className="flex flex-col items-center gap-2 py-8 text-center">
            <CircleCheckIcon className="size-14 text-success" />
            <p className="text-lg font-semibold">{t('Repas remis. Bon appétit !')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {code ? (
              <QrCode value={code} label={t('QR de retrait du repas')} className="aspect-square w-full max-w-64 rounded-xl" />
            ) : (
              <Skeleton className="aspect-square w-full max-w-64 rounded-xl" />
            )}
            <p data-testid="pass-code" className="text-xl font-semibold tracking-[0.15em] tabular-nums">
              <span className="sr-only">{t('Code à saisir si le scan échoue')} : </span>
              {code ? formatCode(code) : '····-····-····'}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {t('Montrez ce code au comptoir. Le personnel vérifie votre nom avant de remettre le repas.')}
            </p>
            <FormError message={error} />
            <Button variant="ghost" size="sm" disabled={pending} onClick={onRenew}>
              <RefreshCwIcon data-icon="inline-start" />
              {t('Nouveau code')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
