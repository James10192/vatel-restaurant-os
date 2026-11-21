import { usePaginatedQuery } from 'convex/react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, ReceiptIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { formatXof } from '#/lib/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { cn } from '#/lib/utils'

const PAGE_SIZE = 15
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

/** Historique des mouvements : pagination serveur, « Charger plus » léger pour faible débit. */
export function WalletHistory() {
  const { results, status, loadMore } = usePaginatedQuery(api.wallet.history, {}, { initialNumItems: PAGE_SIZE })
  return (
    <Card id="historique" className="@container scroll-mt-6 rounded-3xl">
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
          <>
            {/* Zone étroite : lignes compactes. Zone d'au moins 40 rem (tablette, bureau) : tableau aligné. */}
            <ul className="divide-y @2xl:hidden">
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
                      <Amount amountXof={entry.amountXof} />
                      <span className="text-xs text-muted-foreground">Solde {formatXof(entry.balanceAfterXof)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <Table className="hidden @2xl:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opération</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Solde après</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="text-muted-foreground tabular-nums">{dateTime.format(entry._creationTime)}</TableCell>
                    <TableCell className="max-w-80 truncate font-medium">{entry.label}</TableCell>
                    <TableCell className="text-right">
                      <Amount amountXof={entry.amountXof} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{formatXof(entry.balanceAfterXof)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {(status === 'CanLoadMore' || status === 'LoadingMore') && (
          <Button variant="outline" className="@2xl:self-start" disabled={status === 'LoadingMore'} onClick={() => loadMore(PAGE_SIZE)}>
            {status === 'LoadingMore' && <Spinner data-icon="inline-start" />}
            Charger plus
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Montant signé : crédit en couleur primaire, débit neutre ; signe moins typographique. */
function Amount({ amountXof }: { amountXof: number }) {
  const credit = amountXof > 0
  return (
    <span className={cn('text-sm font-semibold tabular-nums', credit && 'text-primary')}>
      {credit ? '+' : '−'}
      {formatXof(Math.abs(amountXof))}
    </span>
  )
}
