import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ClockIcon, UtensilsIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDayLong, todayIso } from '#/lib/format'
import { currentUserQuery } from '#/lib/session'
import { useNow } from '#/lib/use-now'
import { NextMeal } from '#/features/booking/next-meal'
import { DayPicker } from '#/features/menus/day-picker'
import { MealCard } from '#/features/menus/meal-card'
import { addDays, parseWeekSearch, resolveWeek } from '#/features/menus/week'
import { WeekSwitcher } from '#/features/menus/week-switcher'
import { BalanceSummary } from '#/features/wallet/balance-summary'

export const Route = createFileRoute('/_authed/app/')({
  validateSearch: parseWeekSearch,
  head: () => ({ meta: [{ title: 'Accueil | Vatel Restauration' }] }),
  component: AppHome,
})

function AppHome() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const firstName = user?.name.split(' ')[0] ?? ''
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{formatDayLong(todayIso())}</p>
        <h1 className="text-3xl font-bold tracking-tight">Bonjour {firstName}</h1>
        {user?.membership && <p className="text-sm text-muted-foreground">{user.membership.canteenName}</p>}
      </header>
      {user?.membership ? <MemberHome /> : <PendingAccount />}
    </main>
  )
}

function MemberHome() {
  const week = resolveWeek(Route.useSearch().week)
  const { data: items, isPending } = useQuery(convexQuery(api.menus.publishedWeek, { weekStart: week }))
  const { data: bookings = [] } = useQuery(convexQuery(api.bookings.mine, { from: week }))
  const { data: balanceXof } = useQuery(convexQuery(api.wallet.balance, {}))
  const now = useNow()
  const today = todayIso()
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const withMenu = new Set(items?.map((item) => item.date))
  const defaultDay = (withMenu.has(today) && today) || days.find((d) => withMenu.has(d)) || days[0]
  const [picked, setPicked] = useState<{ week: string; day: string } | null>(null)
  const day = picked?.week === week ? picked.day : defaultDay
  const active = bookings.filter((b) => b.status !== 'cancelled')
  const meals = items?.filter((item) => item.date === day) ?? []

  return (
    <>
      <BalanceSummary balanceXof={balanceXof} />
      <NextMeal />
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Menu de la semaine</h2>
          <WeekSwitcher week={week} to="/app" />
        </div>
        <DayPicker days={days} withMenu={withMenu} value={day} onChange={(d) => setPicked({ week, day: d })} today={today} />
        {isPending ? (
          <Skeleton className="h-56 rounded-3xl" />
        ) : meals.length === 0 ? (
          <Empty className="rounded-3xl border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UtensilsIcon />
              </EmptyMedia>
              <EmptyTitle>Pas de menu publié ce jour</EmptyTitle>
              <EmptyDescription>
                {withMenu.size > 0
                  ? 'Choisissez un jour marqué d’un point.'
                  : 'Les plats apparaîtront dès leur publication par le service restauration.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          meals.map((item) => (
            <MealCard
              key={item._id}
              item={item}
              booking={active.find((b) => b.menuItemId === item._id)}
              bookedThisService={active.some((b) => b.date === item.date && b.service === item.service)}
              balanceXof={balanceXof ?? 0}
              now={now}
            />
          ))
        )}
      </section>
    </>
  )
}

function PendingAccount() {
  return (
    <Empty className="rounded-3xl border bg-card">
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
