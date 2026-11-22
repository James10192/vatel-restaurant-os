import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ListSkeleton } from '#/components/page-skeleton'
import { convexQuery } from '@convex-dev/react-query'
import { PackageIcon, PackageMinusIcon, PackagePlusIcon, ScaleIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { MovementDialog } from '#/features/stock/movement-dialog'
import { PurchaseCard } from '#/features/stock/purchase-card'
import { RecentMovements } from '#/features/stock/recent-movements'
import { StockAlerts } from '#/features/stock/stock-alerts'
import { StockTable } from '#/features/stock/stock-table'
import { pageTitle, useT } from '#/i18n/i18n'

const overviewQuery = convexQuery(api.stock.overview, {})

export const Route = createFileRoute('/_authed/admin/stocks')({
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery),
  pendingComponent: ListSkeleton,
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Stocks') }] }),
  component: Stocks,
})

/**
 * Stocks (#6) : ce qu'il y a en réserve (théorique, déduit des préparations, et compté), ce qui manque
 * d'ici dimanche, ce qui expire, et la liste d'achat. Toute correction passe par un inventaire tracé.
 */
function Stocks() {
  const t = useT()
  const { data: rows } = useSuspenseQuery(overviewQuery)
  const actions = (
    <div className="flex flex-wrap gap-2">
      <MovementDialog kind="reception" trigger={<Button><PackagePlusIcon data-icon="inline-start" />{t('Réception')}</Button>} />
      <MovementDialog kind="count" trigger={<Button variant="outline"><ScaleIcon data-icon="inline-start" />{t('Inventaire')}</Button>} />
      <MovementDialog kind="loss" trigger={<Button variant="outline"><PackageMinusIcon data-icon="inline-start" />{t('Perte de matière')}</Button>} />
    </div>
  )
  return (
    <main className="workspace flex flex-col gap-5 py-6 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-muted-foreground">{t('Cuisine')}</p>
          <h1 className="text-display">{t('Stocks')}</h1>
          <p className="text-sm text-muted-foreground">{t('Réserve théorique et comptée, besoins jusqu’à dimanche, dates limites et achats.')}</p>
        </div>
        {actions}
      </header>
      {rows.length === 0 ? (
        <Empty className="rounded-3xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>{t('Aucun stock suivi')}</EmptyTitle>
            <EmptyDescription>{t('Enregistrez une réception ou un inventaire : l’ingrédient sera suivi dès lors.')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{actions}</EmptyContent>
        </Empty>
      ) : (
        <>
          <StockAlerts rows={rows} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
            <StockTable rows={rows} />
            <div className="flex flex-col gap-5">
              <PurchaseCard rows={rows} />
              <RecentMovements />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
