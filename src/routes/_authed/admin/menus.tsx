import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { SendIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS, formatDayLong } from '#/lib/format'
import type { Service } from '#/lib/format'
import { AddItemSheet } from '#/features/menus/add-item-sheet'
import { MenuItemRow } from '#/features/menus/menu-item-row'
import { addDays, parseWeekSearch, resolveWeek } from '#/features/menus/week'
import { WeekSwitcher } from '#/features/menus/week-switcher'

const SERVICES: Array<Service> = ['lunch', 'dinner']
const weekQuery = (weekStart: string) => convexQuery(api.menus.adminWeek, { weekStart })

export const Route = createFileRoute('/_authed/admin/menus')({
  validateSearch: parseWeekSearch,
  loaderDeps: ({ search }) => ({ week: resolveWeek(search.week) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(weekQuery(deps.week)),
  head: () => ({ meta: [{ title: 'Menus | Vatel Restauration' }] }),
  component: AdminMenus,
})

function AdminMenus() {
  const week = resolveWeek(Route.useSearch().week)
  const { data: items } = useSuspenseQuery(weekQuery(week))
  const publishWeek = useMutation(api.menus.publishWeek)
  const [publishing, setPublishing] = useState(false)
  const drafts = items.filter((item) => item.status === 'draft').length
  // Lundi à vendredi par défaut ; samedi et dimanche dès qu'un plat y est programmé.
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter(
    (date, i) => i < 5 || items.some((item) => item.date === date),
  )

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menus de la semaine</h1>
          <p className="text-sm text-muted-foreground">Les brouillons restent invisibles des usagers jusqu'à publication.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeekSwitcher week={week} to="/admin/menus" />
          <Button
            disabled={drafts === 0 || publishing}
            onClick={async () => {
              setPublishing(true)
              await publishWeek({ weekStart: week }).finally(() => setPublishing(false))
            }}
          >
            {publishing ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
            Publier {drafts > 0 ? `(${drafts})` : ''}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {days.map((date) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="first-letter:uppercase">{formatDayLong(date)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {SERVICES.map((service) => {
                const rows = items.filter((item) => item.date === date && item.service === service)
                return (
                  <section key={service} className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-muted-foreground">{SERVICE_LABELS[service]}</h2>
                      <CardAction>
                        <AddItemSheet date={date} service={service} />
                      </CardAction>
                    </div>
                    {rows.length > 0 ? (
                      <ul className="divide-y">
                        {rows.map((item) => (
                          <MenuItemRow key={item._id} item={item} />
                        ))}
                      </ul>
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">Aucun plat programmé.</p>
                    )}
                  </section>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
