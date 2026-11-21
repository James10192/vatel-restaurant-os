import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { PlusIcon, ReceiptTextIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatXof } from '#/lib/format'

/** Carte de solde : montant non affiché tant que le serveur ne l'a pas confirmé. */
export function BalanceCard({ balanceXof, children }: { balanceXof: number | undefined; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/20 sm:p-6">
      <div
        aria-hidden
        className="absolute -top-16 -right-16 -z-10 size-56 rounded-full border-[24px] border-primary-foreground/10"
      />
      <div aria-hidden className="absolute -right-2 -bottom-20 -z-10 size-40 rounded-full bg-primary-foreground/5" />
      <p className="text-sm text-primary-foreground/70">Solde disponible</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
        {balanceXof === undefined ? '…' : formatXof(balanceXof)}
      </p>
      {children}
    </section>
  )
}

/** Version accueil : recharge et historique à portée de pouce. */
export function BalanceSummary({ balanceXof }: { balanceXof: number | undefined }) {
  return (
    <BalanceCard balanceXof={balanceXof}>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" size="lg" className="flex-1" asChild>
          <Link to="/app/wallet">
            <PlusIcon data-icon="inline-start" />
            Recharger
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="flex-1 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          asChild
        >
          <Link to="/app/wallet" hash="historique">
            <ReceiptTextIcon data-icon="inline-start" />
            Historique
          </Link>
        </Button>
      </div>
    </BalanceCard>
  )
}
