import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { cn } from '#/lib/utils'

const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' })
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Jours de la semaine en pastilles défilantes ; un point signale les jours avec menu publié. */
export function DayPicker({
  days,
  withMenu,
  value,
  onChange,
  today,
}: {
  days: Array<string>
  withMenu: Set<string>
  value: string
  onChange: (day: string) => void
  today: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(day) => day && onChange(day)}
      aria-label="Choisir un jour"
      className="-mx-4 flex w-[calc(100%+2rem)] justify-start gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      {days.map((day) => (
        <ToggleGroupItem
          key={day}
          value={day}
          aria-label={toDate(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })}
          className={cn(
            'flex h-auto min-w-14 shrink-0 flex-col gap-0.5 rounded-2xl border bg-card px-3 py-2.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
            !withMenu.has(day) && 'opacity-60',
          )}
        >
          <span className="text-xs font-medium capitalize">{weekday.format(toDate(day)).replace('.', '')}</span>
          <span className="text-lg leading-none font-bold">{dayNumber.format(toDate(day))}</span>
          <span
            aria-hidden
            className={cn(
              'mx-auto size-1.5 rounded-full',
              withMenu.has(day) ? 'bg-current' : 'bg-transparent',
              day === today && !withMenu.has(day) && 'bg-muted-foreground',
            )}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
