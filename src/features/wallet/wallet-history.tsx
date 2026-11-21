import { usePaginatedQuery } from 'convex/react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, ReceiptIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { formatXof } from '#/lib/format'
import { cn } from '#/lib/utils'

const PAGE_SIZE = 15
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

/** Historique des mouvements : pagination serveur, « Charger plus » léger pour faible débit. */
export function WalletHistory() {
  const { results, status, loadMore } = usePaginatedQuery(api.wallet.history, {}, { initialNumItems: PAGE_SIZE })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {status === 'LoadingFirstPage' ? (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </>
        ) : results.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptIcon />
              </EmptyMedia>
              <EmptyTitle>Aucun mouvement</EmptyTitle>
              <EmptyDescription>Vos recharges et réservations apparaîtront ici.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y">
            {results.map((entry) => {
              const credit = entry.amountXof > 0
              const Icon = credit ? ArrowDownLeftIcon : ArrowUpRightIcon
              return (
                <li key={entry._id} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">{dateTime.format(entry._creationTime)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn('text-sm font-semibold', credit && 'text-primary')}>
                      {credit ? '+' : '−'}
                      {formatXof(Math.abs(entry.amountXof))}
                    </span>
                    <span className="text-xs text-muted-foreground">Solde {formatXof(entry.balanceAfterXof)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {(status === 'CanLoadMore' || status === 'LoadingMore') && (
          <Button variant="outline" disabled={status === 'LoadingMore'} onClick={() => loadMore(PAGE_SIZE)}>
            {status === 'LoadingMore' && <Spinner data-icon="inline-start" />}
            Charger plus
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
