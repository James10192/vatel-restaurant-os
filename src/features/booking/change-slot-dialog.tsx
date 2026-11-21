import { useState } from 'react'
import { useMutation } from 'convex/react'
import { ClockIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { SlotSelect } from './slot-select'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '#/components/ui/dialog'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

/** Changer de créneau avant la clôture : le serveur revérifie la place et le délai. */
export function ChangeSlotDialog({ booking }: { booking: { _id: Id<'bookings'>; menuItemId: Id<'menuItems'>; slot: string } }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [slot, setSlot] = useState(booking.slot)
  const action = useServerAction(useMutation(api.bookings.changeSlot))
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setSlot(booking.slot)
          action.setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <ClockIcon data-icon="inline-start" />
          {booking.slot}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Changer de créneau')}</DialogTitle>
          <DialogDescription>{t('Possible jusqu’à la clôture des réservations, selon les places.')}</DialogDescription>
        </DialogHeader>
        <SlotSelect menuItemId={booking.menuItemId} value={slot} onChange={setSlot} current={booking.slot} />
        <FormError message={action.error} />
        <DialogFooter>
          <Button
            disabled={action.pending || slot === booking.slot}
            onClick={async () => {
              if ((await action.run({ bookingId: booking._id, slot })) !== undefined) setOpen(false)
            }}
          >
            {action.pending && <Spinner data-icon="inline-start" />}
            {t('Changer de créneau')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
