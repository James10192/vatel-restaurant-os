import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { ClipboardListIcon, HandPlatterIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Field, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { SERVICE_LABELS } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { DayNav, parseDateSearch, resolveDate } from '#/features/admin/day'

type Status = 'confirmed' | 'picked_up' | 'cancelled'
const STATUS: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  confirmed: { label: 'À servir', variant: 'default' },
  picked_up: { label: 'Remis', variant: 'secondary' },
  cancelled: { label: 'Annulé', variant: 'outline' },
}
const PAGE_SIZE = 25
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

type Search = { date?: string; service?: Service; status?: Status; item?: string }

/** Filtres d'URL validés : valeurs inconnues ignorées (URL non sensible, partageable). */
function parseSearch(search: Record<string, unknown>): Search {
  return {
    ...parseDateSearch(search),
    service: search.service === 'lunch' || search.service === 'dinner' ? search.service : undefined,
    status: typeof search.status === 'string' && search.status in STATUS ? (search.status as Status) : undefined,
    item: typeof search.item === 'string' && search.item.length < 64 ? search.item : undefined,
  }
}

export const Route = createFileRoute('/_authed/admin/services')({
  validateSearch: parseSearch,
  head: () => ({ meta: [{ title: 'Commandes du jour | Vatel Restauration' }] }),
  component: DayOrders,
})

function DayOrders() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const date = resolveDate(search.date)
  const setFilter = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }) })
  const { data: summary } = useQuery(convexQuery(api.admin.daySummary, { date }))
  const offers = summary?.offers.filter((offer) => !search.service || offer.service === search.service) ?? []
  // Changer un filtre change les arguments : Convex repart du premier curseur.
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.dayOrders,
    {
      date,
      service: search.service,
      status: search.status,
      menuItemId: offers.some((o) => o.menuItemId === search.item) ? (search.item as Id<'menuItems'>) : undefined,
    },
    { initialNumItems: PAGE_SIZE },
  )
  const markPickedUp = useServerAction(useMutation(api.admin.markPickedUp))

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Commandes du jour</h1>
          <p className="text-sm text-muted-foreground">Repas réservés, à servir et remis, mis à jour en temps réel.</p>
        </div>
        <DayNav date={date} to="/admin/services" />
      </div>

      <Card className="rounded-3xl py-4">
        <CardContent className="grid gap-4 px-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Service</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={search.service ?? 'all'}
              onValueChange={(value) => value && setFilter({ service: value === 'all' ? undefined : (value as Service), item: undefined })}
              className="w-full"
            >
              <ToggleGroupItem value="all" className="flex-1">
                Tous
              </ToggleGroupItem>
              <ToggleGroupItem value="lunch" className="flex-1">
                {SERVICE_LABELS.lunch}
              </ToggleGroupItem>
              <ToggleGroupItem value="dinner" className="flex-1">
                {SERVICE_LABELS.dinner}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-item">Plat</FieldLabel>
            <NativeSelect
              id="filter-item"
              value={search.item ?? ''}
              onChange={(e) => setFilter({ item: e.target.value || undefined })}
            >
              <NativeSelectOption value="">Tous les plats</NativeSelectOption>
              {offers.map((offer) => (
                <NativeSelectOption key={offer.menuItemId} value={offer.menuItemId}>
                  {offer.dishName} ({SERVICE_LABELS[offer.service].toLowerCase()})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-status">Statut</FieldLabel>
            <NativeSelect
              id="filter-status"
              value={search.status ?? ''}
              onChange={(e) => setFilter({ status: (e.target.value || undefined) as Status | undefined })}
            >
              <NativeSelectOption value="">Tous les statuts</NativeSelectOption>
              {(Object.keys(STATUS) as Array<Status>).map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {STATUS[key].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <FormError message={markPickedUp.error} />

      <Card className="rounded-3xl py-2">
        <CardContent className="px-2 sm:px-4">
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
                <EmptyTitle>Aucune commande</EmptyTitle>
                <EmptyDescription>Aucune réservation ne correspond à ces filtres pour ce jour.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {results.map((order) => (
                <li key={order._id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{order.diner}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {order.dishName} · {SERVICE_LABELS[order.service]} · réservé à {time.format(order._creationTime)}
                    </span>
                  </div>
                  <Badge variant={STATUS[order.status].variant}>{STATUS[order.status].label}</Badge>
                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      disabled={markPickedUp.pending}
                      onClick={() => markPickedUp.run({ bookingId: order._id })}
                    >
                      {markPickedUp.pending ? <Spinner data-icon="inline-start" /> : <HandPlatterIcon data-icon="inline-start" />}
                      Marquer remis
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(status === 'CanLoadMore' || status === 'LoadingMore') && (
            <div className="p-2">
              <Button variant="outline" className="w-full" disabled={status === 'LoadingMore'} onClick={() => loadMore(PAGE_SIZE)}>
                {status === 'LoadingMore' && <Spinner data-icon="inline-start" />}
                Charger plus
              </Button>
            </div>
          )}
          {status === 'Exhausted' && results.length > 0 && (
            <p className="p-2 text-center text-xs text-muted-foreground">Fin de la liste ({results.length} commande{results.length > 1 ? 's' : ''}).</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
