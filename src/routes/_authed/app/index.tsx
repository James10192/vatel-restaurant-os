import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ClockIcon, UtensilsIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { todayIso } from '#/lib/format'
import { HomeGreeting } from '#/features/home/home-greeting'
import { currentUserQuery } from '#/lib/session'
import { useNow } from '#/lib/use-now'
import { NextMeal } from '#/features/booking/next-meal'
import { DayPicker } from '#/features/menus/day-picker'
import { MealCard } from '#/features/menus/meal-card'
import { addDays, parseWeekSearch, resolveWeek } from '#/features/menus/week'
import { WeekSwitcher } from '#/features/menus/week-switcher'
import { BalanceSummary } from '#/features/wallet/balance-summary'
import { UpcomingMeals } from '#/features/booking/upcoming-meals'
import { SmartMenuSheet } from '#/features/smart-menu/smart-menu-sheet'

export const Route = createFileRoute('/_authed/app/')({
  validateSearch: parseWeekSearch,
  head: () => ({ meta: [{ title: 'Accueil | Vatel Restauration' }] }),
  component: AppHome,
})

function AppHome() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const firstName = user?.name.split(' ')[0] ?? ''
  return (
    <main className="workspace flex flex-col gap-6 pt-6 pb-8 md:pt-8 xl:pb-12">
      <HomeGreeting firstName={firstName} canteenName={user?.membership?.canteenName} />
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
  // Jour proposé : prochain jour avec menu dès aujourd'hui, sinon aujourd'hui s'il est dans la semaine.
  const defaultDay =
    days.find((d) => d >= today && withMenu.has(d)) || (days.includes(today) && today) || days.find((d) => withMenu.has(d)) || days[0]
  const [picked, setPicked] = useState<{ week: string; day: string } | null>(null)
  const day = picked?.week === week ? picked.day : defaultDay
  const active = bookings.filter((b) => b.status !== 'cancelled')
  const meals = items?.filter((item) => item.date === day) ?? []

  return (
    // Mobile : une colonne. Tablette : solde et prochain repas côte à côte, repas sur deux colonnes.
    // Bureau : catalogue à gauche, panneau fixe à droite (solde, repas à venir), visible au défilement.
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid gap-4 md:grid-cols-2 md:items-start xl:hidden">
        <BalanceSummary balanceXof={balanceXof} />
        <NextMeal />
      </div>
      <section aria-labelledby="menu-semaine" className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="menu-semaine" className="text-xl font-semibold tracking-tight">
            Menu de la semaine
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SmartMenuSheet days={days.filter((d) => d >= today)} menu={items ?? []} balanceXof={balanceXof ?? 0} />
            <WeekSwitcher week={week} to="/app" />
          </div>
        </div>
        <DayPicker days={days} withMenu={withMenu} value={day} onChange={(d) => setPicked({ week, day: d })} today={today} />
        {isPending ? (
          <div className="meal-grid">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
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
          <div className="meal-grid">
            {meals.map((item) => (
              <MealCard
                key={item._id}
                item={item}
                booking={active.find((b) => b.menuItemId === item._id)}
                bookedThisService={active.some((b) => b.date === item.date && b.service === item.service)}
                balanceXof={balanceXof ?? 0}
                now={now}
              />
            ))}
          </div>
        )}
      </section>
      <aside aria-label="Mon compte repas" className="hidden flex-col gap-4 xl:sticky xl:top-8 xl:col-start-2 xl:row-start-1 xl:flex">
        <BalanceSummary balanceXof={balanceXof} />
        <UpcomingMeals />
      </aside>
    </div>
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
