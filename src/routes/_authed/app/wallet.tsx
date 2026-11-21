import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { DemoTopUp } from '#/features/wallet/demo-top-up'
import { WalletHistory } from '#/features/wallet/wallet-history'
import { BalanceCard } from '#/features/wallet/balance-summary'

export const Route = createFileRoute('/_authed/app/wallet')({
  head: () => ({ meta: [{ title: 'Solde | Vatel Restauration' }] }),
  component: WalletPage,
})

function WalletPage() {
  const { data: balanceXof } = useQuery(convexQuery(api.wallet.balance, {}))
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Mon solde</h1>
      <BalanceCard balanceXof={balanceXof}>
        <p className="mt-3 text-xs text-primary-foreground/70">Crédits de démonstration, non convertibles.</p>
      </BalanceCard>
      <DemoTopUp />
      <WalletHistory />
    </main>
  )
}
