import { Link } from '@tanstack/react-router'
import { CircleAlertIcon, EyeIcon, InfoIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { addDays } from '../../../convex/lib/dates'
import type { Point, Severity } from '../../../convex/lib/copilot/brief'
import { formatDayShort, formatDecimal } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/i18n/i18n'
import type { Locale } from '#/i18n/i18n'

/** Valeurs d'un point mises en forme pour la langue : décimales à la virgule en français, dates lisibles. */
function displayValues(values: Record<string, string | number>, locale: Locale) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, key === 'day' && typeof value === 'string' ? formatDayShort(value, locale) : typeof value === 'number' ? formatDecimal(value, locale) : value]),
  )
}

const SEVERITY: Record<Severity, { icon: LucideIcon; tone: string; label: string }> = {
  action: { icon: CircleAlertIcon, tone: 'text-destructive', label: 'À faire' },
  watch: { icon: EyeIcon, tone: 'text-warning', label: 'À surveiller' },
  info: { icon: InfoIcon, tone: 'text-muted-foreground', label: 'Pour information' },
}

/**
 * Points d'attention calculés par le serveur (copilote, assistant), traduits par l'interface.
 * `priorities` (facultatif) : identifiants choisis par l'IA, affichés en tête et numérotés.
 */
export function PointList({ points, priorities = [], date }: { points: Array<Point>; priorities?: Array<string>; date: string }) {
  const t = useT()
  const { locale } = useLocale()
  const rank = new Map(priorities.map((id, i) => [id, i]))
  const ordered = [...points].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
  if (ordered.length === 0) return <p className="text-sm text-muted-foreground">{t('Rien à signaler pour ce jour.')}</p>
  return (
    <ol className="flex flex-col gap-2">
      {ordered.map((point) => {
        const { icon: Icon, tone, label } = SEVERITY[point.severity]
        const priority = rank.get(point.id)
        return (
          <li key={point.id} className={cn('flex gap-3 rounded-2xl border p-3', priority !== undefined && 'border-primary')}>
            <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', tone)} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{priority !== undefined ? t('Priorité {n}', { n: priority + 1 }) : t(label)}</span>
              <span className="text-sm">{t(point.message, displayValues(point.values, locale))}</span>
              {point.kind === 'tomorrow_target' && (
                <Link to="/admin/production" search={{ date: addDays(date, 1) }} className="text-sm font-semibold text-primary underline underline-offset-2">
                  {t('Ouvrir le plan de demain pour valider')}
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
