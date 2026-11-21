import { Link } from '@tanstack/react-router'
import { WalletIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { formatXof } from '#/lib/format'

/** Résumé du solde, avec accès direct à l'historique et à la recharge. */
export function BalanceSummary({ balanceXof }: { balanceXof: number }) {
  return (
    <Card className="bg-primary py-4 text-primary-foreground">
      <CardContent className="flex items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
            <WalletIcon />
          </span>
          <div className="flex flex-col">
            <span className="text-xs text-primary-foreground/70">Mon solde</span>
            <span className="text-xl font-bold">{formatXof(balanceXof)}</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/app/wallet">Gérer</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
