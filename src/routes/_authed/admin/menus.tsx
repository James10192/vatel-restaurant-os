import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { SendIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { todayIso } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { DayBrowser, WeekPlanner } from '#/features/menus/week-planner'
import { addDays, parseWeekSearch, resolveWeek } from '#/features/menus/week'
import { WeekSwitcher } from '#/features/menus/week-switcher'

const weekQuery = (weekStart: string) =>
  convexQuery(api.menus.adminWeek, { weekStart })

export const Route = createFileRoute('/_authed/admin/menus')({
  validateSearch: parseWeekSearch,
  loaderDeps: ({ search }) => ({ week: resolveWeek(search.week) }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(weekQuery(deps.week)),
  head: () => ({ meta: [{ title: 'Menus | Vatel Restauration' }] }),
  component: AdminMenus,
})

function AdminMenus() {
  const week = resolveWeek(Route.useSearch().week)
  const { data: items } = useSuspenseQuery(weekQuery(week))
  const drafts = items.filter((item) => item.status === 'draft').length
  const today = todayIso()
  const stats = [
    { label: 'Plats programmés', value: items.length },
    { label: 'Brouillons', value: drafts },
    {
      label: 'Portions offertes',
      value: items.reduce((sum, item) => sum + item.capacity, 0),
    },
  ]
  // Les 7 jours, comme côté usager : le week-end doit pouvoir être programmé.
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))

  return (
    <main className="workspace flex flex-col gap-6 pt-6 pb-10 md:pt-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="text-eyebrow text-muted-foreground">
            Carte de la semaine
          </p>
          <h1 className="text-display">Menus</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Composez les services, puis publiez : les brouillons restent
            invisibles des usagers.
          </p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between xl:gap-6">
          <dl className="grid grid-cols-3 divide-x rounded-2xl border bg-card shadow-card md:min-w-md">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 px-3 py-2.5 sm:px-4"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xl font-bold tracking-tight tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <WeekSwitcher week={week} to="/admin/menus" />
        </div>
      </header>

      <WeekPlanner days={days} items={items} today={today} />
      <DayBrowser days={days} items={items} today={today} />

      <PublishBar week={week} drafts={drafts} />
    </main>
  )
}

/** Action principale de l'écran, toujours à portée : collée en bas tant qu'il reste des brouillons. */
function PublishBar({ week, drafts }: { week: string; drafts: number }) {
  const { run, pending, error } = useServerAction(
    useMutation(api.menus.publishWeek),
  )
  if (drafts === 0 && !error) return null
  return (
    // Mobile : au-dessus de la barre de navigation du bas (fixe, ~4 rem + zone sûre), sinon le bouton est masqué.
    <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
      <div className="mx-auto flex max-w-xl flex-col gap-2 rounded-2xl border bg-card p-3 shadow-raised sm:flex-row sm:items-center">
        <p className="flex-1 px-1 text-sm">
          <span className="font-semibold tabular-nums">
            {drafts} brouillon{drafts > 1 ? 's' : ''}
          </span>{' '}
          <span className="text-muted-foreground">
            non visible{drafts > 1 ? 's' : ''} des usagers
          </span>
        </p>
        <Button
          size="lg"
          disabled={pending || drafts === 0}
          onClick={() => run({ weekStart: week })}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          Publier la semaine
        </Button>
        <FormError message={error} />
      </div>
    </div>
  )
}
