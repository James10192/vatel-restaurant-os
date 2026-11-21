import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { CalendarCheckIcon, CircleSlashIcon, HandPlatterIcon, SoupIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Progress } from '#/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { DayNav, parseDateSearch, resolveDate } from '#/features/admin/day'

const summaryQuery = (date: string) => convexQuery(api.admin.daySummary, { date })

export const Route = createFileRoute('/_authed/admin/')({
  validateSearch: parseDateSearch,
  loaderDeps: ({ search }) => ({ date: resolveDate(search.date) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(summaryQuery(deps.date)),
  head: () => ({ meta: [{ title: 'Vue d’ensemble | Vatel Restauration' }] }),
  component: Overview,
})

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: number; hint: string; icon: LucideIcon }) {
  return (
    <Card className="gap-2 rounded-3xl py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardDescription className="font-medium">{label}</CardDescription>
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </CardContent>
    </Card>
  )
}

/** Tableau de bord du jour : chiffres réels issus des réservations, mis à jour en temps réel par Convex. */
function Overview() {
  const date = resolveDate(Route.useSearch().date)
  const { data } = useSuspenseQuery(summaryQuery(date))
  const { totals, offers } = data
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Vue d’ensemble</h1>
          <p className="text-sm text-muted-foreground">Réservations réelles de la journée, actualisées automatiquement.</p>
        </div>
        <DayNav date={date} to="/admin" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Réservés" value={totals.confirmed} hint="À servir" icon={CalendarCheckIcon} />
        <Kpi label="Retirés" value={totals.pickedUp} hint="Repas remis" icon={HandPlatterIcon} />
        <Kpi label="Annulés" value={totals.cancelled} hint="Remboursés" icon={CircleSlashIcon} />
        <Kpi label="Portions restantes" value={totals.remaining} hint={`Sur ${totals.capacity} proposées`} icon={SoupIcon} />
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Par plat</CardTitle>
          <CardDescription>
            Montant des réservations actives : {formatXof(totals.demoAmountXof)} en crédits de démonstration (aucun
            encaissement réel).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SoupIcon />
                </EmptyMedia>
                <EmptyTitle>Aucun plat publié ce jour</EmptyTitle>
                <EmptyDescription>Programmez et publiez des plats depuis Menus.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plat</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Réservés</TableHead>
                    <TableHead className="text-right">Retirés</TableHead>
                    <TableHead className="text-right">Annulés</TableHead>
                    <TableHead className="min-w-40">Disponibilité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.menuItemId}>
                      <TableCell className="font-medium">{offer.dishName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{SERVICE_LABELS[offer.service]}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{offer.confirmed}</TableCell>
                      <TableCell className="text-right tabular-nums">{offer.pickedUp}</TableCell>
                      <TableCell className="text-right tabular-nums">{offer.cancelled}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Progress
                            value={offer.capacity ? (offer.remaining / offer.capacity) * 100 : 0}
                            aria-label={`${offer.remaining} portions restantes sur ${offer.capacity}`}
                            className="h-1.5"
                          />
                          <span className="text-xs text-muted-foreground">
                            {offer.remaining} / {offer.capacity} restantes
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
