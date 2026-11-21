import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { DemoTopUp } from '#/features/wallet/demo-top-up'
import { WalletHistory } from '#/features/wallet/wallet-history'
import { BalanceCard } from '#/features/wallet/balance-summary'
import { useT } from '#/i18n/i18n'

export const Route = createFileRoute('/_authed/app/wallet')({
  head: () => ({ meta: [{ title: 'Solde | Vatel Restauration' }] }),
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
    <main className="workspace flex flex-col gap-6 pt-2 pb-8 md:pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-eyebrow text-muted-foreground">{t('Porte-monnaie')}</p>
        <h1 className="text-display">{t('Mon solde')}</h1>
        <p className="text-sm text-muted-foreground">{t('Crédits de démonstration, non convertibles : aucun paiement réel.')}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-8">
        <div className="flex flex-col gap-6 md:sticky md:top-8">
          <BalanceCard balanceXof={balanceXof}>
            <p className="mt-3 text-xs text-primary-foreground/70">{t('Crédits de démonstration, non convertibles.')}</p>
          </BalanceCard>
          <DemoTopUp />
        </div>
        <WalletHistory />
      </div>
    </main>
  )
}
