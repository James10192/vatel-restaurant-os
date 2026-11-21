import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, CircleSlashIcon, ClockIcon, HandPlatterIcon, SoupIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { TONES, percent } from './overview'
import type { OrderStatus, Summary, Tone } from './overview'

const STATS: Array<{
  key: 'confirmed' | 'pickedUp' | 'cancelled' | 'remaining'
  label: string
  icon: LucideIcon
  tone: Tone
  status?: OrderStatus
}> = [
  { key: 'confirmed', label: 'À servir', icon: ClockIcon, tone: 'confirmed', status: 'confirmed' },
  { key: 'pickedUp', label: 'Remis', icon: HandPlatterIcon, tone: 'picked_up', status: 'picked_up' },
  { key: 'cancelled', label: 'Annulés', icon: CircleSlashIcon, tone: 'cancelled', status: 'cancelled' },
  { key: 'remaining', label: 'Libres', icon: SoupIcon, tone: 'remaining' },
]

/**
 * Quatre indicateurs : couleur du statut, chiffre, part de la capacité. Les trois premiers ouvrent
 * les commandes déjà filtrées (flèche visible) ; « Libres » est une information, pas un lien.
 */
export function StatTiles({ date, totals }: { date: string; totals: Summary['totals'] }) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map(({ key, label, icon: Icon, tone, status }) => {
        const value = totals[key]
        const share = percent(value, totals.capacity)
        const body = (
          <>
            <span className="flex items-center justify-between">
              <span className={cn('flex size-9 items-center justify-center rounded-xl', TONES[tone].chip)}>
                <Icon className="size-[1.125rem]" />
              </span>
              {status && (
                <ArrowUpRightIcon
                  aria-hidden
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              )}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-2xl leading-none font-bold tracking-tight tabular-nums sm:text-3xl">{value}</span>
              <span className="text-sm text-muted-foreground">{t(label)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <span className={cn('block h-full rounded-full', TONES[tone].bar)} style={{ width: `${share}%` }} />
              </span>
              <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{share} %</span>
            </span>
          </>
        )
        const tile = 'group flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card sm:gap-4'
        return status ? (
          <Link
            key={key}
            to="/admin/services"
            search={{ date, status }}
            className={cn(
              tile,
              'press transition-colors hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            )}
          >
            {body}
          </Link>
        ) : (
          <div key={key} className={tile}>
            {body}
          </div>
        )
      })}
    </div>
  )
}
