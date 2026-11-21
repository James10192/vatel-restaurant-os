import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ClockIcon, UtensilsIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDayLong } from '#/lib/format'
import { currentUserQuery } from '#/lib/session'
import { MealCard } from '#/features/menus/meal-card'
import { parseWeekSearch, resolveWeek } from '#/features/menus/week'
import { WeekSwitcher } from '#/features/menus/week-switcher'
import { BalanceSummary } from '#/features/wallet/balance-summary'
import { NextMeal } from '#/features/booking/next-meal'
import { useNow } from '#/lib/use-now'

export const Route = createFileRoute('/_authed/app/')({
  validateSearch: parseWeekSearch,
  head: () => ({ meta: [{ title: 'Repas | Vatel Restauration' }] }),
  component: AppHome,
})

function AppHome() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{user?.membership?.canteenName ?? 'Vatel Restauration'}</p>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {user?.name}</h1>
      </div>
      {user?.membership ? <WeekMenu /> : <PendingAccount />}
    </main>
  )
}

function WeekMenu() {
  const week = resolveWeek(Route.useSearch().week)
  const { data: items, isPending } = useQuery(convexQuery(api.menus.publishedWeek, { weekStart: week }))
  const { data: bookings = [] } = useQuery(convexQuery(api.bookings.mine, { from: week }))
  const { data: balanceXof = 0 } = useQuery(convexQuery(api.wallet.balance, {}))
  const now = useNow()
  const days = [...new Set(items?.map((item) => item.date))].sort()
  const active = bookings.filter((b) => b.status !== 'cancelled')
  return (
    <section className="flex flex-col gap-4">
      <BalanceSummary balanceXof={balanceXof} />
      <NextMeal />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Menu de la semaine</h2>
        <WeekSwitcher week={week} to="/app" />
      </div>
      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : days.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun menu publié cette semaine</EmptyTitle>
            <EmptyDescription>Les plats apparaîtront ici dès leur publication par le service restauration.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        days.map((date) => (
          <div key={date} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground first-letter:uppercase">{formatDayLong(date)}</h3>
            {items
              ?.filter((item) => item.date === date)
              .map((item) => (
                <MealCard
                  key={item._id}
                  item={item}
                  booking={active.find((b) => b.menuItemId === item._id)}
                  bookedThisService={active.some((b) => b.date === item.date && b.service === item.service)}
                  balanceXof={balanceXof}
                  now={now}
                />
              ))}
          </div>
        ))
      )}
    </section>
  )
}

function PendingAccount() {
  return (
    <Empty className="border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClockIcon />
        </EmptyMedia>
        <EmptyTitle>Compte en attente de rattachement</EmptyTitle>
        <EmptyDescription>
          Votre établissement doit valider votre compte avant que vous puissiez réserver. Contactez le service restauration.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
