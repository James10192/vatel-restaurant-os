import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { DemoTopUp } from '#/features/wallet/demo-top-up'
import { WalletHistory } from '#/features/wallet/wallet-history'
import { BalanceCard } from '#/features/wallet/balance-summary'
import { useT, pageTitle } from '#/i18n/i18n'
import { PageHeader } from '#/components/page-header'

export const Route = createFileRoute('/_authed/app/wallet')({
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Solde') }] }),
  component: WalletPage,
})

/**
 * Espace financier. Mobile : solde, recharge, historique empilés.
 * Tablette et bureau : deux zones, le solde et la recharge restent visibles pendant qu'on parcourt l'historique.
 */
function WalletPage() {
  const t = useT()
  const { data: balanceXof } = useQuery(convexQuery(api.wallet.balance, {}))
  return (
    <main className="workspace flex flex-col gap-6 py-6 md:py-8 xl:py-10">
      <PageHeader
        title={t('Mon solde')}
        description={t('Rechargez votre compte et suivez chaque mouvement.')}
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-8">
        <div className="flex flex-col gap-6 md:sticky md:top-8">
          <BalanceCard balanceXof={balanceXof} />
          <DemoTopUp />
        </div>
        <WalletHistory />
      </div>
    </main>
  )
}
