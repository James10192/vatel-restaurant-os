import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Link } from '@tanstack/react-router'
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
import { Separator } from '#/components/ui/separator'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'

type Meal = { _id: Id<'menuItems'>; dishName: string; date: string; service: Service; priceXof: number }

/**
 * Confirmation explicite avant débit. La clé d'idempotence est créée à l'ouverture : un double clic
 * ou une nouvelle tentative après coupure réseau ne débite qu'une fois.
 */
export function BookMealDialog({ meal, balanceXof }: { meal: Meal; balanceXof: number }) {
  const [open, setOpen] = useState(false)
  const [requestKey, setRequestKey] = useState('')
  const { run, pending, error } = useServerAction(useMutation(api.bookings.book))
  const after = balanceXof - meal.priceXof

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRequestKey(crypto.randomUUID())
        setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="lg" className="px-6">
          Réserver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la réservation</AlertDialogTitle>
          <AlertDialogDescription>
            {meal.dishName}, {SERVICE_LABELS[meal.service].toLowerCase()} du {formatDayLong(meal.date)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Prix</dt>
            <dd className="font-semibold">{formatXof(meal.priceXof)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Solde actuel</dt>
            <dd>{formatXof(balanceXof)}</dd>
          </div>
          <Separator />
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Solde après réservation</dt>
            <dd className="font-semibold">{after >= 0 ? formatXof(after) : 'Insuffisant'}</dd>
          </div>
        </dl>
        <FormError message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Retour</AlertDialogCancel>
          {after >= 0 ? (
            <Button
              disabled={pending}
              onClick={async () => {
                const result = await run({ menuItemId: meal._id, idempotencyKey: requestKey })
                if (result) setOpen(false)
              }}
            >
              {pending && <Spinner data-icon="inline-start" />}
              Confirmer et payer
            </Button>
          ) : (
            <Button asChild>
              <Link to="/app/wallet">Recharger mon compte</Link>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
