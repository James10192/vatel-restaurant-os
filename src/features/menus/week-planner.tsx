import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { MoonIcon, SunIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import { SERVICE_LABELS } from '#/lib/format'
import type { Service } from '#/lib/format'
import { cn } from '#/lib/utils'
import { AddItemSheet } from './add-item-sheet'
import { AdminDayCard } from './admin-day-card'
import { DayPicker } from './day-picker'
import { MenuItemRow } from './menu-item-row'

type AdminWeekItem = FunctionReturnType<typeof api.menus.adminWeek>[number]
type WeekProps = {
  days: Array<string>
  items: Array<AdminWeekItem>
  today: string
}

const SERVICES: Array<{ service: Service; icon: typeof SunIcon }> = [
  { service: 'lunch', icon: SunIcon },
  { service: 'dinner', icon: MoonIcon },
]
const weekdayShort = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  timeZone: 'UTC',
})
const dayNumber = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  timeZone: 'UTC',
})
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const itemsOf = (items: Array<AdminWeekItem>, date: string, service?: Service) =>
  items.filter((item) => item.date === date && (!service || item.service === service))

/**
 * Bureau (≥ 1280 px) : planning de la semaine d'un seul regard, 7 colonnes × Déjeuner / Dîner.
 * Chaque cellule liste ses plats (fiches compactes par container query) et permet d'en ajouter sur place.
 */
export function WeekPlanner({ days, items, today }: WeekProps) {
  return (
    <div
      role="grid"
      aria-label="Planning de la semaine"
      className="hidden overflow-hidden rounded-3xl border bg-card shadow-card xl:grid xl:grid-cols-[6.5rem_repeat(7,minmax(0,1fr))]"
    >
      <div role="row" className="contents">
        <span role="columnheader" className="border-b bg-muted/40" />
        {days.map((date) => {
          const count = itemsOf(items, date).length
          return (
            <div
              key={date}
              role="columnheader"
              className={cn('flex flex-col gap-0.5 border-b border-l px-3 py-3', date === today ? 'bg-secondary' : 'bg-muted/40')}
            >
              <span className="text-eyebrow text-muted-foreground">{weekdayShort.format(toDate(date))}</span>
              <span className="flex items-baseline gap-2">
                <span className={cn('text-xl font-bold tracking-tight tabular-nums', date === today && 'text-primary')}>
                  {dayNumber.format(toDate(date))}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count === 0 ? 'vide' : `${count} plat${count > 1 ? 's' : ''}`}
                </span>
              </span>
            </div>
          )
        })}
      </div>
      {SERVICES.map(({ service, icon: Icon }, row) => (
        <div key={service} role="row" className="contents">
          <span
            role="rowheader"
            className={cn('flex items-start gap-1.5 px-3 py-4 text-eyebrow text-muted-foreground', row > 0 && 'border-t')}
          >
            <Icon className="size-3.5" />
            {SERVICE_LABELS[service]}
          </span>
          {days.map((date) => (
            <div
              key={date}
              role="gridcell"
              className={cn('flex min-h-36 flex-col gap-2 border-l p-2', row > 0 && 'border-t', date === today && 'bg-secondary/40')}
            >
              <ul className="flex flex-col gap-2">
                {itemsOf(items, date, service).map((item) => (
                  <MenuItemRow key={item._id} item={item} />
                ))}
              </ul>
              <AddItemSheet
                date={date}
                service={service}
                className="mt-auto w-full rounded-xl border-dashed bg-transparent text-muted-foreground shadow-none hover:text-foreground"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Mobile et tablette : un jour à la fois.
 * Mobile : jours en pastilles défilantes au-dessus du jour choisi. Tablette : liste des jours à gauche (avec compteurs), jour à droite.
 */
export function DayBrowser({ days, items, today }: WeekProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const day = picked && days.includes(picked) ? picked : (days.find((d) => d === today) ?? days[0])
  const withMenu = new Set(items.map((item) => item.date))
  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:items-start md:gap-6 xl:hidden">
      <div className="md:hidden">
        <DayPicker days={days} withMenu={withMenu} value={day} onChange={setPicked} today={today} />
      </div>
      <nav aria-label="Jours de la semaine" className="hidden flex-col gap-1 md:sticky md:top-6 md:flex">
        {days.map((date) => {
          const count = itemsOf(items, date).length
          const drafts = itemsOf(items, date).filter((item) => item.status === 'draft').length
          return (
            <button
              key={date}
              type="button"
              aria-current={date === day ? 'date' : undefined}
              onClick={() => setPicked(date)}
              className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=date]:bg-primary aria-[current=date]:text-primary-foreground"
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold capitalize">
                  {weekdayShort.format(toDate(date))} {dayNumber.format(toDate(date))}
                </span>
                <span className="text-xs opacity-70">
                  {count === 0 ? 'Aucun plat' : `${count} plat${count > 1 ? 's' : ''}`}
                  {drafts > 0 && `, ${drafts} brouillon${drafts > 1 ? 's' : ''}`}
                </span>
              </span>
              {date === today && <span className="text-eyebrow opacity-80">Auj.</span>}
            </button>
          )
        })}
      </nav>
      <AdminDayCard date={day} isToday={day === today} items={itemsOf(items, day)} />
    </div>
  )
}
