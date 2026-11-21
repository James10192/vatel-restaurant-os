import { Link } from '@tanstack/react-router'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { ArrowRightIcon, HandPlatterIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

const SHOWN = 6

/**
 * File « à servir maintenant » du cockpit (bureau) : les premières commandes confirmées du jour,
 * remises en un clic. Mêmes requête et mutation serveur que la page Commandes du jour.
 */
export function ServeQueue({ date, pendingCount }: { date: string; pendingCount: number }) {
  const t = useT()
  const { results, status } = usePaginatedQuery(api.admin.dayOrders, { date, status: 'confirmed' }, { initialNumItems: SHOWN })
  const markPickedUp = useServerAction(useMutation(api.admin.markPickedUp))
  return (
    <Card className="gap-3 rounded-3xl py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{t('À servir maintenant')}</CardTitle>
        <CardDescription className="tabular-nums">
          {pendingCount === 0 ? t('Aucun repas en attente') : `${pendingCount} repas en attente`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        {status === 'LoadingFirstPage' ? (
          <Skeleton className="mx-2 h-12 rounded-2xl" />
        ) : results.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{t('Tous les repas réservés ont été remis.')}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {results.slice(0, SHOWN).map((order) => (
              <li key={order._id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{order.diner}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {order.dishName}, {t(SERVICE_LABELS[order.service]).toLowerCase()}
                  </span>
                </span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Marquer remis : ${order.diner}`}
                  title={t('Marquer remis')}
                  disabled={markPickedUp.pending}
                  onClick={() => markPickedUp.run({ bookingId: order._id })}
                >
                  {markPickedUp.pending ? <Spinner /> : <HandPlatterIcon />}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <FormError message={markPickedUp.error} />
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <Link to="/admin/services" search={{ date, status: 'confirmed' }}>
            {t('Toutes les commandes')}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
