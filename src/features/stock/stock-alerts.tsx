import { CalendarClockIcon, CircleAlertIcon, Link2OffIcon } from 'lucide-react'
import { formatQty } from '../production/quantities'
import { alertsOf } from './stock-model'
import type { StockRow } from './stock-model'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { formatDayShort, todayIso } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'

/** Ce qui demande une action : ruptures prévues, lots à utiliser vite (avec les plats qui les emploient), unités à harmoniser. */
export function StockAlerts({ rows }: { rows: Array<StockRow> }) {
  const t = useT()
  const { locale } = useLocale()
  const today = todayIso()
  const withAlerts = rows.map((row) => ({ row, ...alertsOf(row, today) }))
  const shortages = withAlerts.filter((a) => a.shortage > 0)
  const expiring = withAlerts.filter((a) => a.expiring.length > 0)
  const incompatible = withAlerts.filter((a) => a.incompatible.length > 0)
  if (shortages.length + expiring.length + incompatible.length === 0) return null
  return (
    <section aria-label={t('Alertes de stock')} className="grid gap-3 lg:grid-cols-3">
      {shortages.length > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('Rupture prévue d’ici dimanche')}</AlertTitle>
          <AlertDescription>
            <ul>
              {shortages.map(({ row, shortage }) => (
                <li key={row.ingredientId}>{t('{name} : il manque {qty}', { name: row.name, qty: formatQty(shortage, row.unit) })}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {expiring.length > 0 && (
        <Alert>
          <CalendarClockIcon />
          <AlertTitle>{t('À utiliser vite')}</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {expiring.flatMap(({ row, expiring: lots }) =>
                lots.map((lot) => (
                  <li key={`${row.ingredientId}-${lot.lotCode ?? lot.expiresOn}`}>
                    {t(lot.expired ? '{name} : {qty}, date limite dépassée ({day})' : '{name} : {qty} avant le {day}', {
                      name: row.name,
                      qty: formatQty(lot.remaining, row.unit),
                      day: formatDayShort(lot.expiresOn ?? today, locale),
                    })}
                    {!lot.expired && row.usedIn.length > 0 && <span className="block text-xs">{t('Plats qui l’utilisent : {dishes}.', { dishes: row.usedIn.join(', ') })}</span>}
                  </li>
                )),
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {incompatible.length > 0 && (
        <Alert>
          <Link2OffIcon />
          <AlertTitle>{t('Unités sans conversion')}</AlertTitle>
          <AlertDescription>
            <ul>
              {incompatible.map(({ row }) => (
                <li key={row.ingredientId}>
                  {t('{name} : stock en {unit}, fiche en {other}. Harmonisez l’unité de la fiche ou du stock.', { name: row.name, unit: row.unit, other: row.incompatible.join(', ') })}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}
