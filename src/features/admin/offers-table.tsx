import { Link } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { DishVisual } from '#/components/dish-visual'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { CapacityBar } from './overview'
import { useT } from '#/i18n/i18n'

type Offer = FunctionReturnType<typeof api.admin.daySummary>['offers'][number]

/** Bureau : détail par plat en tableau dense (chiffres alignés, jauge de capacité, accès aux commandes du plat). */
export function OffersTable({ date, offers }: { date: string; offers: Array<Offer> }) {
  const t = useT()
  return (
    <div className="rounded-3xl border bg-card px-4 py-2 shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Plat')}</TableHead>
            <TableHead>{t('Service')}</TableHead>
            <TableHead className="text-right">{t('Prix')}</TableHead>
            <TableHead className="text-right">{t('À servir')}</TableHead>
            <TableHead className="text-right">{t('Remis')}</TableHead>
            <TableHead className="text-right">{t('Annulés')}</TableHead>
            <TableHead className="w-[28%]">{t('Capacité')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.menuItemId}>
              <TableCell>
                <Link
                  to="/admin/services"
                  search={{ date, item: offer.menuItemId }}
                  className="flex items-center gap-3 rounded-xl font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <DishVisual name={offer.dishName} className="size-9 shrink-0 rounded-xl text-xs" />
                  <span className="truncate">{offer.dishName}</span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{t(SERVICE_LABELS[offer.service])}</TableCell>
              <TableCell className="text-right tabular-nums">{formatXof(offer.priceXof)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{offer.confirmed}</TableCell>
              <TableCell className="text-right tabular-nums">{offer.pickedUp}</TableCell>
              <TableCell className="text-right tabular-nums">{offer.cancelled}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <CapacityBar offer={offer} />
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t('{remaining} / {capacity} libres', { remaining: offer.remaining, capacity: offer.capacity })}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
