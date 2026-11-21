import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { DownloadIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import { analyticsCsv } from '../../../convex/lib/analytics'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatXof } from '#/lib/format'
import { useT } from '#/i18n/i18n'

type Totals = FunctionReturnType<typeof api.analytics.period>['totals']
type Tile = { label: string; value: string; detail: string }

/** Marque d'ordre des octets : Excel lit le fichier en UTF-8. */
const BOM = '﻿'

/**
 * Indicateurs d'une période (#9). Chaque taux montre son dénominateur ; retrait et absences ne portent que sur
 * les services terminés. Crédits de démonstration : jamais présentés comme un chiffre d'affaires réel.
 */
export function Indicators({ endDate }: { endDate: string }) {
  const t = useT()
  const [days, setDays] = useState<7 | 30>(7)
  const { data } = useQuery(convexQuery(api.analytics.period, { endDate, days }))
  const download = () => {
    if (!data) return
    const url = URL.createObjectURL(new Blob([BOM, analyticsCsv(data.rows)], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: `indicateurs-${days}j-${endDate}.csv` }).click()
    URL.revokeObjectURL(url)
  }
  return (
    <section aria-labelledby="indicators-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="indicators-title" className="text-lg font-semibold">
          {t('Indicateurs')}
        </h2>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" variant="outline" value={String(days)} onValueChange={(v) => v && setDays(v === '30' ? 30 : 7)} aria-label={t('Période')}>
            <ToggleGroupItem value="7" className="px-3 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {t('7 jours')}
            </ToggleGroupItem>
            <ToggleGroupItem value="30" className="px-3 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {t('30 jours')}
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" disabled={!data} onClick={download}>
            <DownloadIcon data-icon="inline-start" />
            {t('Exporter')}
          </Button>
        </div>
      </div>
      {!data ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tilesOf(data.totals, t).map((tile) => (
            <li key={tile.label} className="flex flex-col gap-1 rounded-3xl border bg-card p-4 shadow-card">
              <span className="text-xs text-muted-foreground">{tile.label}</span>
              <span className="text-2xl leading-none font-bold tracking-tight tabular-nums">{tile.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{tile.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function tilesOf(totals: Totals, t: (text: string, vars?: Record<string, string | number>) => string): Array<Tile> {
  const pct = (rate: Totals['pickupRate']) => (rate.value === null ? '?' : `${rate.value} %`)
  const ratio = (rate: Totals['pickupRate'], unit: string) => t('{n} sur {d} {unit}', { n: rate.numerator, d: rate.denominator, unit: t(unit) })
  return [
    { label: t('Retrait'), value: pct(totals.pickupRate), detail: ratio(totals.pickupRate, 'réservés (services terminés)') },
    { label: t('Absents'), value: pct(totals.noShowRate), detail: ratio(totals.noShowRate, 'réservés (services terminés)') },
    { label: t('Annulations'), value: pct(totals.cancelRate), detail: ratio(totals.cancelRate, 'demandes') },
    { label: t('Pertes'), value: pct(totals.wasteRate), detail: ratio(totals.wasteRate, 'portions préparées') },
    { label: t('Surplus récupéré'), value: pct(totals.recoveredRate), detail: ratio(totals.recoveredRate, 'portions préparées') },
    {
      label: t('Satisfaction'),
      value: totals.rating.value === null ? '?' : `${String(totals.rating.value).replace('.', ',')} / 5`,
      detail: t(totals.rating.count > 1 ? '{n} notes' : '{n} note', { n: totals.rating.count }),
    },
    {
      label: t('Écart du plan'),
      value: totals.planError.value === null ? '?' : String(totals.planError.value).replace('.', ','),
      detail: t('portions par service, sur {n} services planifiés', { n: totals.planError.services }),
    },
    { label: t('Plats complets'), value: String(totals.soldOut), detail: t('sur {n} offres publiées', { n: totals.offers }) },
    { label: t('Sans réservation'), value: String(totals.walkIns), detail: t('repas servis au comptoir') },
    { label: t('Crédits engagés'), value: formatXof(totals.demoCreditsXof), detail: t('{n} réservations, crédits de démonstration', { n: totals.booked }) },
  ]
}
