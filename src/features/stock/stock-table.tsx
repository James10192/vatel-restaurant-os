import { PackageMinusIcon, PackagePlusIcon, ScaleIcon } from 'lucide-react'
import { formatQty } from '../production/quantities'
import { MovementDialog } from './movement-dialog'
import type { StockRow } from './stock-model'
import { Button } from '#/components/ui/button'
import { formatXof, dateFormat } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/i18n/i18n'

/** Un ingrédient par ligne : stock théorique, dernier comptage, besoin d'ici dimanche ; gestes rapides sur la ligne. */
export function StockTable({ rows }: { rows: Array<StockRow> }) {
  const t = useT()
  const { locale } = useLocale()
  const day = dateFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.ingredientId} className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate font-semibold">{row.name}</h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              {row.lastCount
                ? t('Compté {qty} le {day}', { qty: formatQty(row.lastCount.quantity, row.unit), day: day.format(row.lastCount.at) })
                : t('Jamais compté : stock déduit des réceptions')}
              {row.avgUnitCostXof !== null && <>, {t('{price} par {unit}', { price: formatXof(Math.round(row.avgUnitCostXof)), unit: row.unit })}</>}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums sm:text-right">
            <div>
              <dt className="text-xs text-muted-foreground">{t('Stock théorique')}</dt>
              <dd className="text-lg font-bold whitespace-nowrap">{formatQty(row.theoretical, row.unit)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('Besoin d’ici dimanche')}</dt>
              <dd className={cn('text-lg font-bold whitespace-nowrap', row.need !== null && row.need > row.theoretical && 'text-destructive')}>
                {row.need === null ? '?' : formatQty(row.need, row.unit)}
              </dd>
            </div>
          </dl>
          <div className="flex gap-1">
            <MovementDialog kind="reception" ingredientId={row.ingredientId} trigger={<Button size="icon" variant="ghost" aria-label={t('Réception de {name}', { name: row.name })}><PackagePlusIcon /></Button>} />
            <MovementDialog kind="count" ingredientId={row.ingredientId} trigger={<Button size="icon" variant="ghost" aria-label={t('Inventaire de {name}', { name: row.name })}><ScaleIcon /></Button>} />
            <MovementDialog kind="loss" ingredientId={row.ingredientId} trigger={<Button size="icon" variant="ghost" aria-label={t('Perte de {name}', { name: row.name })}><PackageMinusIcon /></Button>} />
          </div>
        </li>
      ))}
    </ul>
  )
}
