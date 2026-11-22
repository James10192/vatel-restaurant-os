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
import { downloadCsv } from '#/lib/download'
import { formatDecimal, formatXof } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'
import type { Locale } from '#/i18n/i18n'

type Totals = FunctionReturnType<typeof api.analytics.period>['totals']
type Tile = { label: string; value: string; detail: string }
type Group = { title: string; tiles: Array<Tile> }

/**
 * Indicateurs d'une période (#9). Chaque taux montre son dénominateur ; retrait et absences ne portent que sur
 * les services terminés. Crédits de démonstration : jamais présentés comme un chiffre d'affaires réel.
 */
export function Indicators({ endDate }: { endDate: string }) {
  const t = useT()
  const { locale } = useLocale()
  const [days, setDays] = useState<7 | 30>(7)
  const { data } = useQuery(convexQuery(api.analytics.period, { endDate, days }))
  const download = () => data && downloadCsv(`indicateurs-${days}j-${endDate}.csv`, analyticsCsv(data.rows))
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
        // Une carte, trois familles. Mobile : une ligne par indicateur (valeur à droite). Bureau : cellules en grille.
        <div className="divide-y rounded-3xl border bg-card shadow-card">
          {groupsOf(data.totals, t, locale).map((group) => (
            <section key={group.title} aria-label={group.title} className="flex flex-col gap-1 p-4 md:p-5">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <dl className="grid divide-y md:grid-cols-3 md:gap-x-6 md:divide-y-0 xl:grid-cols-5">
                {group.tiles.map((tile) => (
                  <div key={tile.label} className="flex items-baseline justify-between gap-4 py-2.5 md:flex-col md:items-start md:justify-start md:gap-1">
                    <div className="flex min-w-0 flex-col md:order-2">
                      <dt className="text-sm md:text-xs md:text-muted-foreground">{tile.label}</dt>
                      <dd className="text-xs text-muted-foreground tabular-nums">{tile.detail}</dd>
                    </div>
                    <dd className="shrink-0 text-xl leading-none font-bold tracking-tight tabular-nums md:order-1 md:text-2xl">{tile.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function groupsOf(totals: Totals, t: (text: string, vars?: Record<string, string | number>) => string, locale: Locale): Array<Group> {
  const pct = (rate: Totals['pickupRate']) => (rate.value === null ? '?' : `${rate.value} %`)
  const ratio = (rate: Totals['pickupRate'], unit: string) => t('{n} sur {d} {unit}', { n: rate.numerator, d: rate.denominator, unit: t(unit) })
  const tile = (label: string, value: string, detail: string): Tile => ({ label: t(label), value, detail })
  return [
    {
      title: t('Service'),
      tiles: [
        tile('Retrait', pct(totals.pickupRate), ratio(totals.pickupRate, 'réservés (services terminés)')),
        tile('Absents', pct(totals.noShowRate), ratio(totals.noShowRate, 'réservés (services terminés)')),
        tile('Annulations', pct(totals.cancelRate), ratio(totals.cancelRate, 'demandes')),
        tile('Plats complets', String(totals.soldOut), t('sur {n} offres publiées', { n: totals.offers })),
        tile('Sans réservation', String(totals.walkIns), t('repas servis au comptoir')),
      ],
    },
    {
      title: t('Cuisine'),
      tiles: [
        tile('Pertes', pct(totals.wasteRate), ratio(totals.wasteRate, 'portions préparées')),
        tile('Surplus récupéré', pct(totals.recoveredRate), ratio(totals.recoveredRate, 'portions préparées')),
        tile(
          'Écart des passages estimés',
          totals.planError.value === null ? '?' : formatDecimal(totals.planError.value, locale),
          t('repas par service, sur {n} services planifiés', { n: totals.planError.services }),
        ),
      ],
    },
    {
      title: t('Usagers'),
      tiles: [
        tile(
          'Satisfaction',
          totals.rating.value === null ? '?' : `${formatDecimal(totals.rating.value, locale)} / 5`,
          t(totals.rating.count > 1 ? '{n} notes' : '{n} note', { n: totals.rating.count }),
        ),
        tile('Crédits engagés', formatXof(totals.demoCreditsXof), t('{n} réservations, crédits de démonstration', { n: totals.booked })),
      ],
    },
  ]
}
