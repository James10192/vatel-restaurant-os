import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { formatQty } from '../production/quantities'
import { Skeleton } from '#/components/ui/skeleton'
import { LOSS_REASONS } from './movement-dialog'
import { dateFormat, formatDayShort } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'

const KIND = { reception: 'Réception', count: 'Inventaire', loss: 'Perte' } as const

/** Les 20 derniers mouvements (qui, quand, quoi) : relecture et traçabilité, sans modification possible. */
export function RecentMovements() {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useQuery(convexQuery(api.stock.recent, {}))
  const when = dateFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  return (
    <section className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold">{t('Derniers mouvements')}</h2>
      {!data ? (
        <Skeleton className="h-24" />
      ) : (
        <ol className="flex flex-col divide-y text-sm">
          {data.map((m) => (
            <li key={m._id} className="flex flex-col py-1.5">
              <span className="flex justify-between gap-2">
                <span className="truncate">
                  {t(KIND[m.kind])} : {m.ingredient}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatQty(m.quantity, m.unit)}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  when.format(m.at),
                  m.by,
                  m.lotCode && t('lot {code}', { code: m.lotCode }),
                  m.expiresOn && t('à utiliser avant le {day}', { day: formatDayShort(m.expiresOn, locale) }),
                  m.supplier,
                  m.lossReason && t(LOSS_REASONS[m.lossReason]),
                ]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
