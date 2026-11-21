import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { weekStartOf } from '../../../convex/lib/dates'
import { materialsFor, plannedDemand, sumMaterials, toProduce } from '../../../convex/lib/production/plan'
import type { MaterialNeed } from '../../../convex/lib/production/plan'
import { MaterialsList } from './quantities'
import type { ProductionOffer } from './types'
import { Skeleton } from '#/components/ui/skeleton'
import { SERVICE_LABELS, formatDayLong, todayIso } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'

const COLUMNS = ['Réservées', 'Objectif', 'Préparé', 'Absents'] as const

/** Chiffres d'une offre dans l'ordre des colonnes ; « - » quand la donnée n'existe pas encore. */
const figures = (o: ProductionOffer, past: boolean): Array<[(typeof COLUMNS)[number], number | string]> => [
  ['Réservées', o.confirmed + o.pickedUp],
  ['Objectif', o.plan ? plannedDemand(o, o.plan) : '-'],
  ['Préparé', o.prepared ?? '-'],
  ['Absents', past ? o.noShow : '-'],
]

/** Semaine de production : par jour et par plat, puis la matière à prévoir pour finir la semaine (base des achats). */
export function WeekView({ date, service }: { date: string; service?: Service }) {
  const t = useT()
  const { locale } = useLocale()
  const today = todayIso()
  const { data, isPending } = useQuery(convexQuery(api.productionPlan.week, { weekStart: weekStartOf(date) }))
  if (isPending || !data) return <Skeleton className="h-64 rounded-3xl" />
  const days = data.map((day) => ({ ...day, offers: day.offers.filter((o) => !service || o.service === service) }))
  const remaining = days.flatMap((day) => day.offers.map((o) => ({ o, portions: toProduce(o, o.plan, day.date, today) }))).filter((x) => x.portions > 0)
  const needs = remaining.map(({ o, portions }) => materialsFor(o.recipe, portions))
  const materials = sumMaterials(needs.filter((n): n is Array<MaterialNeed> => n !== null))
  const withoutRecipe = [...new Set(remaining.filter((_, i) => needs[i] === null).map(({ o }) => o.dishName))]

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <ol className="flex flex-col gap-3">
        {days
          .filter((day) => day.offers.length > 0)
          .map((day) => (
            <li key={day.date} className="rounded-3xl border bg-card p-4 shadow-card">
              <h3 className="mb-2 text-sm font-semibold first-letter:uppercase">{formatDayLong(day.date, locale)}</h3>
              <ul className="flex flex-col divide-y sm:hidden">
                {day.offers.map((o) => (
                  <li key={o.menuItemId} className="flex flex-col gap-1.5 py-2">
                    <span className="truncate font-medium">
                      {o.dishName} <span className="text-xs font-normal text-muted-foreground">{t(SERVICE_LABELS[o.service])}</span>
                    </span>
                    <dl className="grid grid-cols-4 gap-1 text-xs tabular-nums">
                      {figures(o, day.date < today).map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-muted-foreground">{t(label)}</dt>
                          <dd className="text-sm font-semibold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full table-fixed text-sm tabular-nums sm:table">
                <colgroup>
                  <col />
                  {COLUMNS.map((label) => (
                    <col key={label} className="w-24" />
                  ))}
                </colgroup>
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left font-normal">{t('Plat')}</th>
                    {COLUMNS.map((label) => (
                      <th key={label} className="py-1 text-right font-normal">
                        {t(label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {day.offers.map((o) => (
                    <tr key={o.menuItemId}>
                      <td className="py-1.5 pr-2">
                        <span className="block truncate">{o.dishName}</span>
                        <span className="text-xs text-muted-foreground">{t(SERVICE_LABELS[o.service])}</span>
                      </td>
                      {figures(o, day.date < today).map(([label, value]) => (
                        <td key={label} className="py-1.5 text-right">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        {days.every((day) => day.offers.length === 0) && <li className="text-sm text-muted-foreground">{t('Aucun plat publié cette semaine.')}</li>}
      </ol>
      <aside className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card xl:sticky xl:top-6">
        <h2 className="text-sm font-semibold">{t('Matière à prévoir d’ici dimanche')}</h2>
        <p className="text-xs text-muted-foreground">{t('Demande restante (réservations et objectifs validés) multipliée par les fiches techniques.')}</p>
        <MaterialsList needs={materials} emptyLabel={t('Rien à produire d’ici dimanche.')} />
        {withoutRecipe.length > 0 && <p className="text-xs text-muted-foreground">{t('Sans fiche technique : {dishes}.', { dishes: withoutRecipe.join(', ') })}</p>}
      </aside>
    </div>
  )
}
