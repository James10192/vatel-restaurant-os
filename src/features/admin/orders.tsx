import type { FunctionReturnType } from 'convex/server'
import { HandPlatterIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { SERVICE_LABELS } from '#/lib/format'

export type OrderStatus = 'confirmed' | 'picked_up' | 'cancelled'
type Order = FunctionReturnType<typeof api.admin.dayOrders>['page'][number]

export const ORDER_STATUS: Record<
  OrderStatus,
  {
    label: string
    plural: string
    variant: 'default' | 'secondary' | 'outline'
  }
> = {
  confirmed: { label: 'À servir', plural: 'À servir', variant: 'default' },
  picked_up: { label: 'Remis', plural: 'Remis', variant: 'secondary' },
  cancelled: { label: 'Annulé', plural: 'Annulés', variant: 'outline' },
}

const time = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

type RowProps = {
  orders: Array<Order>
  pending: boolean
  onPickUp: (bookingId: Id<'bookings'>) => void
}

function PickUpButton({ order, pending, onPickUp, wide = false }: { order: Order; wide?: boolean } & Omit<RowProps, 'orders'>) {
  return (
    <Button size={wide ? 'lg' : 'sm'} className={wide ? 'w-full' : undefined} disabled={pending} onClick={() => onPickUp(order._id)}>
      {pending ? <Spinner data-icon="inline-start" /> : <HandPlatterIcon data-icon="inline-start" />}
      Marquer remis
    </Button>
  )
}

/**
 * Une seule source de commandes, deux présentations :
 * - jusqu'à 1023 px : cartes tactiles, action « Marquer remis » pleine largeur sous la commande à servir ;
 * - dès 1024 px : tableau opérationnel dense, action rapide en bout de ligne.
 */
export function OrderRows({ orders, pending, onPickUp }: RowProps) {
  return (
    <>
      <ul className="flex flex-col gap-2 lg:hidden">
        {orders.map((order) => (
          <li key={order._id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{order.diner}</span>
                <span className="text-sm text-muted-foreground">
                  {order.dishName}, {SERVICE_LABELS[order.service].toLowerCase()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">Réservé à {time.format(order._creationTime)}</span>
              </div>
              <Badge variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
            </div>
            {order.status === 'confirmed' && <PickUpButton order={order} pending={pending} onPickUp={onPickUp} wide />}
          </li>
        ))}
      </ul>

      <Table className="hidden lg:table">
        <TableHeader>
          <TableRow>
            <TableHead>Convive</TableHead>
            <TableHead>Plat</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Réservé à</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id}>
              <TableCell className="max-w-56 truncate font-medium">{order.diner}</TableCell>
              <TableCell className="max-w-64 truncate">{order.dishName}</TableCell>
              <TableCell className="text-muted-foreground">{SERVICE_LABELS[order.service]}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{time.format(order._creationTime)}</TableCell>
              <TableCell>
                <Badge variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {order.status === 'confirmed' ? (
                  <PickUpButton order={order} pending={pending} onPickUp={onPickUp} />
                ) : (
                  <span className="text-xs text-muted-foreground">Aucune</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
