import { DownloadIcon } from 'lucide-react'
import { formatQty } from '../production/quantities'
import { purchaseCsv, purchaseList } from './stock-model'
import type { StockRow } from './stock-model'
import { Button } from '#/components/ui/button'
import { formatXof, todayIso } from '#/lib/format'
import { useT } from '#/i18n/i18n'

/** Marque d'ordre des octets : Excel lit alors le fichier en UTF-8 (accents corrects). */
const BOM = '\uFEFF'

/**
 * Liste d'achat proposée (besoin d'ici dimanche moins stock théorique). Une proposition : la commande reste une
 * décision humaine, faite hors de l'application ; l'export sert à l'envoyer au fournisseur.
 */
export function PurchaseCard({ rows }: { rows: Array<StockRow> }) {
  const t = useT()
  const list = purchaseList(rows)
  const total = list.every((p) => p.costXof !== null) ? list.reduce((n, p) => n + (p.costXof ?? 0), 0) : null
  const download = () => {
    const url = URL.createObjectURL(new Blob([BOM, purchaseCsv(list)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `achats-${todayIso()}.csv` })
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('À acheter d’ici dimanche')}</h2>
        {list.length > 0 && (
          <Button size="sm" variant="outline" onClick={download}>
            <DownloadIcon data-icon="inline-start" />
            {t('Exporter')}
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('Le stock couvre la production prévue.')}</p>
      ) : (
        <ul className="divide-y rounded-2xl border text-sm">
          {list.map((p) => (
            <li key={p.name} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                {p.supplier && <span className="text-xs text-muted-foreground">{p.supplier}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end tabular-nums">
                <span className="font-semibold">{formatQty(p.quantity, p.unit)}</span>
                {p.costXof !== null && <span className="text-xs text-muted-foreground">{t('environ {amount}', { amount: formatXof(p.costXof) })}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {total === null ? t('Coût total inconnu : certains prix ne sont pas renseignés.') : t('Coût estimé : {amount}, d’après les derniers prix reçus.', { amount: formatXof(total) })}
        </p>
      )}
    </section>
  )
}
