import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DashboardSkeleton } from '#/components/page-skeleton'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, usePaginatedQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ClipboardListIcon, SlidersHorizontalIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Field, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { SERVICE_LABELS, todayIso } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { DayNav, parseDateSearch, resolveDate } from '#/features/admin/day'
import { PassScanner } from '#/features/admin/pass-scanner'
import { CounterPanel } from '#/features/admin/counter-panel'
import { ServiceSettings } from '#/features/admin/service-settings'
import { currentUserQuery } from '#/lib/session'
import { ORDER_STATUS, OrderRows } from '#/features/admin/orders'
import type { OrderStatus } from '#/features/admin/orders'
import { useT, pageTitle } from '#/i18n/i18n'

const PAGE_SIZE = 25
const summaryQuery = (date: string) => convexQuery(api.admin.daySummary, { date })
type Offer = FunctionReturnType<typeof api.admin.daySummary>['offers'][number]
type Search = {
  date?: string
  service?: Service
  status?: OrderStatus
  item?: string
}
type SetFilter = (patch: Partial<Search>) => void

/** Filtres d'URL validés : valeurs inconnues ignorées (URL non sensible, partageable). */
function parseSearch(search: Record<string, unknown>): Search {
  return {
    ...parseDateSearch(search),
    service: search.service === 'lunch' || search.service === 'dinner' ? search.service : undefined,
    status: typeof search.status === 'string' && Object.hasOwn(ORDER_STATUS, search.status) ? (search.status as OrderStatus) : undefined,
    item: typeof search.item === 'string' && search.item.length < 64 ? search.item : undefined,
  }
}

export const Route = createFileRoute('/_authed/admin/services')({
  validateSearch: parseSearch,
  loaderDeps: ({ search }) => ({ date: resolveDate(search.date) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(summaryQuery(deps.date)),
  pendingComponent: DashboardSkeleton,
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Commandes du jour') }] }),
  component: DayOrders,
})

function DayOrders() {
  const t = useT()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const date = resolveDate(search.date)
  const setFilter: SetFilter = (patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })
  const { data: summary } = useSuspenseQuery(summaryQuery(date))
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const isAdmin = user?.membership?.role === 'admin'
  const offers = summary.offers.filter((offer) => !search.service || offer.service === search.service)
  const item = offers.some((o) => o.menuItemId === search.item) ? (search.item as Id<'menuItems'>) : undefined
  // Changer un filtre change les arguments : Convex repart du premier curseur.
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.dayOrders,
    { date, service: search.service, status: search.status, menuItemId: item },
    { initialNumItems: PAGE_SIZE },
  )
  const markPickedUp = useServerAction(useMutation(api.admin.markPickedUp))
  const activeFilters = Number(Boolean(search.service)) + Number(Boolean(item))

  return (
    <main className="workspace flex flex-col gap-5 py-6 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-muted-foreground">{t('Service')}</p>
          <h1 className="text-display">{t('Commandes du jour')}</h1>
          <p className="text-sm text-muted-foreground">{t('Repas réservés, à servir et remis, mis à jour en temps réel.')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {date === todayIso() && <PassScanner />}
          {isAdmin && <ServiceSettings />}
          <DayNav date={date} to="/admin/services" />
        </div>
      </header>

      {/* Barre de travail : compteurs par statut toujours visibles ; filtres en ligne dès la tablette, en Sheet sur mobile. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <StatusTabs offers={item ? offers.filter((o) => o.menuItemId === item) : offers} value={search.status} onChange={setFilter} />
        <div className="hidden items-end gap-3 md:flex">
          <FilterFields offers={offers} search={search} setFilter={setFilter} />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="self-start md:hidden">
              <SlidersHorizontalIcon data-icon="inline-start" />
              {t('Filtres')}
              {activeFilters > 0 && <Badge className="ml-1">{activeFilters}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>{t('Filtrer les commandes')}</SheetTitle>
              <SheetDescription>{t('Les filtres s’appliquent immédiatement.')}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <FilterFields offers={offers} search={search} setFilter={setFilter} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {date === todayIso() && offers.length > 0 && <CounterPanel date={date} offers={offers} />}

      <FormError message={markPickedUp.error} />

      <section aria-label={t('Commandes')} className="rounded-3xl border bg-card p-2 shadow-card lg:px-4 lg:py-2">
        {status === 'LoadingFirstPage' ? (
          <div className="flex flex-col gap-2 p-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : results.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>{t('Aucune commande')}</EmptyTitle>
              <EmptyDescription>{t('Aucune réservation ne correspond à ces filtres pour ce jour.')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <OrderRows orders={results} pending={markPickedUp.pending} onPickUp={(bookingId) => markPickedUp.run({ bookingId })} />
        )}
        {(status === 'CanLoadMore' || status === 'LoadingMore') && (
          <div className="p-2">
            <Button variant="outline" className="w-full lg:w-auto" disabled={status === 'LoadingMore'} onClick={() => loadMore(PAGE_SIZE)}>
              {status === 'LoadingMore' && <Spinner data-icon="inline-start" />}
              {t('Charger plus')}
            </Button>
          </div>
        )}
        {status === 'Exhausted' && results.length > 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            {t(results.length > 1 ? 'Fin de la liste ({n} commandes).' : 'Fin de la liste ({n} commande).', { n: results.length })}
          </p>
        )}
      </section>
    </main>
  )
}

/** Onglets-compteurs : chiffres réels du jour (service et plat filtrés), un clic filtre la liste par statut. */
function StatusTabs({ offers, value, onChange }: { offers: Array<Offer>; value: OrderStatus | undefined; onChange: SetFilter }) {
  const t = useT()
  const count = (key: 'confirmed' | 'pickedUp' | 'cancelled') => offers.reduce((n, offer) => n + offer[key], 0)
  const counts = {
    confirmed: count('confirmed'),
    picked_up: count('pickedUp'),
    cancelled: count('cancelled'),
  }
  const all = counts.confirmed + counts.picked_up + counts.cancelled
  const tabs: Array<{ value: OrderStatus | 'all'; label: string; n: number }> = [
    { value: 'all', label: 'Toutes', n: all },
    ...(Object.keys(ORDER_STATUS) as Array<OrderStatus>).map((key) => ({
      value: key,
      label: ORDER_STATUS[key].plural,
      n: counts[key],
    })),
  ]
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={2}
      aria-label={t('Statut')}
      value={value ?? 'all'}
      onValueChange={(next) => next && onChange({ status: next === 'all' ? undefined : (next as OrderStatus) })}
      className="-mx-4 w-[calc(100%+2rem)] justify-start overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:w-auto md:px-0"
    >
      {tabs.map((tab) => (
        <ToggleGroupItem key={tab.value} value={tab.value} className="shrink-0 gap-2 rounded-full px-4 data-[state=on]:border-primary">
          {t(tab.label)}
          <span className="rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums">{tab.n}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function FilterFields({ offers, search, setFilter }: { offers: Array<Offer>; search: Search; setFilter: SetFilter }) {
  const t = useT()
  return (
    <>
      <Field className="md:w-auto">
        <FieldLabel>{t('Service')}</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          value={search.service ?? 'all'}
          onValueChange={(value) =>
            value &&
            setFilter({
              service: value === 'all' ? undefined : (value as Service),
              item: undefined,
            })
          }
          className="w-full md:w-auto"
        >
          <ToggleGroupItem value="all" className="flex-1 px-3">
            {t('Tous')}
          </ToggleGroupItem>
          <ToggleGroupItem value="lunch" className="flex-1 px-3">
            {t(SERVICE_LABELS.lunch)}
          </ToggleGroupItem>
          <ToggleGroupItem value="dinner" className="flex-1 px-3">
            {t(SERVICE_LABELS.dinner)}
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <Field className="md:w-56">
        <FieldLabel htmlFor="filter-item">{t('Plat')}</FieldLabel>
        <NativeSelect id="filter-item" value={search.item ?? ''} onChange={(e) => setFilter({ item: e.target.value || undefined })}>
          <NativeSelectOption value="">{t('Tous les plats')}</NativeSelectOption>
          {offers.map((offer) => (
            <NativeSelectOption key={offer.menuItemId} value={offer.menuItemId}>
              {offer.dishName} ({t(SERVICE_LABELS[offer.service]).toLowerCase()})
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </>
  )
}
