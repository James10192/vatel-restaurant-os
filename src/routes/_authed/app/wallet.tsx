import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Card, CardContent } from '#/components/ui/card'
import { formatXof } from '#/lib/format'
import { DemoTopUp } from '#/features/wallet/demo-top-up'
import { WalletHistory } from '#/features/wallet/wallet-history'

export const Route = createFileRoute('/_authed/app/wallet')({
  head: () => ({ meta: [{ title: 'Solde | Vatel Restauration' }] }),
  component: WalletPage,
})

function WalletPage() {
  const { data: balanceXof } = useQuery(convexQuery(api.wallet.balance, {}))
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Mon solde</h1>
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col gap-1">
          <span className="text-sm text-primary-foreground/70">Disponible</span>
          <span className="text-4xl font-bold">{balanceXof === undefined ? '…' : formatXof(balanceXof)}</span>
        </CardContent>
      </Card>
      <DemoTopUp />
      <WalletHistory />
    </main>
  )
}
