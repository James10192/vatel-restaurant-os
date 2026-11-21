import { MoonIcon, SunIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { SERVICE_LABELS } from '#/lib/format'
import type { Service } from '#/lib/format'
import { cn } from '#/lib/utils'
import { AddItemSheet } from './add-item-sheet'
import { MenuItemRow } from './menu-item-row'

type AdminWeekItem = FunctionReturnType<typeof api.menus.adminWeek>[number]

const SERVICES: Array<{ service: Service; icon: typeof SunIcon }> = [
  { service: 'lunch', icon: SunIcon },
  { service: 'dinner', icon: MoonIcon },
]
const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Une journée de la carte : en-tête daté, puis Déjeuner et Dîner côte à côte dès la tablette. */
export function AdminDayCard({ date, items, isToday }: { date: string; items: Array<AdminWeekItem>; isToday: boolean }) {
  const drafts = items.filter((item) => item.status === 'draft').length
  return (
    <section
      aria-labelledby={`day-${date}`}
      className={cn('rounded-3xl border bg-card/60 p-3 shadow-card sm:p-4', isToday && 'border-ring/40')}
    >
      <header className="flex items-baseline justify-between gap-3 px-1 pb-3">
        <h2 id={`day-${date}`} className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight capitalize">{weekday.format(toDate(date))}</span>
          <span className="text-sm text-muted-foreground">{dayMonth.format(toDate(date))}</span>
          {isToday && <span className="text-eyebrow text-ring">Aujourd'hui</span>}
        </h2>
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {items.length === 0 ? 'Aucun plat' : `${items.length} plat${items.length > 1 ? 's' : ''}`}
          {drafts > 0 && `, ${drafts} brouillon${drafts > 1 ? 's' : ''}`}
        </span>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {SERVICES.map(({ service, icon: Icon }) => {
          const rows = items.filter((item) => item.service === service)
          return (
            <div key={service} className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-2.5">
              <div className="flex items-center justify-between gap-2 pl-1">
                <h3 className="flex items-center gap-1.5 text-eyebrow text-muted-foreground">
                  <Icon className="size-3.5" />
                  {SERVICE_LABELS[service]}
                </h3>
                <AddItemSheet date={date} service={service} />
              </div>
              {rows.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {rows.map((item) => (
                    <MenuItemRow key={item._id} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed bg-background/60 px-3 py-4 text-center text-sm text-muted-foreground">
                  Aucun plat programmé
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
