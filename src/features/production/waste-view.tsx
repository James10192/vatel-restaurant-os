import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { HeartHandshakeIcon, TrashIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { materialsFor, sumMaterials } from '../../../convex/lib/production/plan'
import type { MaterialNeed } from '../../../convex/lib/production/plan'
import { WASTE_REASONS, WASTE_REASON_LABELS, maxDeclarable, wasteBalance } from '../../../convex/lib/production/waste'
import { MaterialsList } from './quantities'
import { DeclareWasteDialog, RecoverDialog } from './record-dialogs'
import type { ProductionOffer } from './types'
import { Button } from '#/components/ui/button'
import { formatDayShort } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/i18n/i18n'

export const wasteWeekQuery = (endDate: string) => convexQuery(api.production.wasteWeek, { endDate })

/**
 * Vue « Pertes réelles » (#6) : uniquement ce qui a été mesuré en cuisine. Préparé, remis, perdu (avec motif)
 * et reste à déclarer sont distincts ; aucune économie n'est annoncée ici.
 */
export function WasteView({ date, offers, canRecord }: { date: string; offers: Array<ProductionOffer>; canRecord: boolean }) {
  const t = useT()
  const lost = sumMaterials(
    offers
      .map((o) => materialsFor(o.recipe, wasteBalance(o).wasted))
      .filter((n): n is Array<MaterialNeed> => n !== null),
  )
  return (
    <div className="flex flex-col gap-5">
      <WeekStrip date={date} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <ul className="flex flex-col gap-3">
          {offers.map((offer) => (
            <WasteRow key={offer.menuItemId} offer={offer} canRecord={canRecord} />
          ))}
        </ul>
        <aside className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">{t('Matière perdue estimée')}</h2>
          <p className="text-xs text-muted-foreground">{t('Portions perdues multipliées par la fiche technique de chaque plat.')}</p>
          <MaterialsList needs={lost} emptyLabel={t('Aucune perte déclarée ce jour.')} />
        </aside>
      </div>
    </div>
  )
}

function WasteRow({ offer, canRecord }: { offer: ProductionOffer; canRecord: boolean }) {
  const t = useT()
  const b = wasteBalance(offer)
  const max = offer.prepared === null ? 0 : maxDeclarable(offer.prepared, b.served, b.wasted + b.recovered)
  return (
    <li className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate font-semibold">{offer.dishName}</h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t('Préparé {p}, remis {s}, perdu {w}', { p: b.prepared ?? '?', s: b.served, w: b.wasted })}
          {b.recovered > 0 && <>, {t('{n} récupérées', { n: b.recovered })}</>}
          {b.pending !== null && b.pending > 0 && <>, {t('{n} encore à servir', { n: b.pending })}</>}
          {b.unexplained !== null && b.unexplained > 0 && <>, {t('{n} sans explication', { n: b.unexplained })}</>}
        </p>
        {b.wasted > 0 && (
          <p className="text-xs text-muted-foreground">
            {WASTE_REASONS.filter((r) => offer.waste[r] > 0)
              .map((r) => `${t(WASTE_REASON_LABELS[r])} ${offer.waste[r]}`)
              .join(', ')}
          </p>
        )}
        {b.servedExceedsPrepared && <p className="text-xs text-warning">{t('Plus de repas remis que préparés : saisie de cuisine incomplète.')}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={cn('text-2xl font-bold tabular-nums', (b.wasteRate ?? 0) >= 10 && 'text-destructive')}>
          {b.wasteRate === null ? '?' : `${b.wasteRate} %`}
        </span>
        {canRecord && (
          <RecoverDialog
            offer={offer}
            max={max}
            trigger={
              <Button variant="outline" size="sm" disabled={offer.prepared === null || max === 0}>
                <HeartHandshakeIcon data-icon="inline-start" />
                {t('Surplus récupéré')}
              </Button>
            }
          />
        )}
        {canRecord && (
          <DeclareWasteDialog
            offer={offer}
            max={max}
            trigger={
              <Button variant="outline" size="sm" disabled={offer.prepared === null || max === 0}>
                <TrashIcon data-icon="inline-start" />
                {t('Déclarer une perte')}
              </Button>
            }
          />
        )}
      </div>
    </li>
  )
}

/** Sept derniers jours : barre = part perdue du préparé (mesurée). Un jour sans saisie reste vide, pas à zéro. */
function WeekStrip({ date }: { date: string }) {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useSuspenseQuery(wasteWeekQuery(date))
  const prepared = data.reduce((n, d) => n + d.prepared, 0)
  // Échelle relative au pire jour : les écarts restent lisibles même à 2-15 %.
  const worst = Math.max(...data.map((d) => (d.prepared > 0 ? d.wasted / d.prepared : 0)), 0.01)
  const wasted = data.reduce((n, d) => n + d.wasted, 0)
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('Gaspillage mesuré sur 7 jours')}</h2>
        <p className="text-sm tabular-nums">
          {prepared > 0
            ? t('{w} portions perdues sur {p} préparées ({rate} %)', { w: wasted, p: prepared, rate: Math.round((wasted / prepared) * 100) })
            : t('Aucune production saisie sur la période.')}
        </p>
      </div>
      <ol className="grid grid-cols-7 items-end gap-1.5">
        {data.map((d) => {
          const rate = d.prepared > 0 ? d.wasted / d.prepared : null
          return (
            <li key={d.date} className="flex flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end rounded-lg bg-muted">
                {rate !== null && (
                  <span className="w-full rounded-lg bg-[var(--vatel-corail)]" style={{ height: `${Math.max((rate / worst) * 100, 4)}%` }} />
                )}
              </div>
              <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{rate === null ? '?' : `${Math.round(rate * 100)}%`}</span>
              <span className={cn('text-[0.6875rem] tabular-nums', d.date === date ? 'font-semibold' : 'text-muted-foreground')}>
                {formatDayShort(d.date, locale)}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
