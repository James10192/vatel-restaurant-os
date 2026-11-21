import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ClipboardListIcon, SoupIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { DayNav, parseDateSearch, resolveDate, serviceDayLabel } from '#/features/admin/day'
import { OffersByService, ServiceHero, StatTiles } from '#/features/admin/overview'
import { OffersTable } from '#/features/admin/offers-table'
import { ServeQueue } from '#/features/admin/serve-queue'
import { todayIso } from '#/lib/format'
import { useMinWidth } from '#/lib/use-min-width'
import { weekStartOf } from '../../../../convex/lib/dates'
import { useT , useLocale, pageTitle } from '#/i18n/i18n'

const summaryQuery = (date: string) => convexQuery(api.admin.daySummary, { date })

export const Route = createFileRoute('/_authed/admin/')({
  validateSearch: parseDateSearch,
  loaderDeps: ({ search }) => ({ date: resolveDate(search.date) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(summaryQuery(deps.date)),
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Vue d’ensemble') }] }),
  component: Overview,
})

/** Tableau de bord du jour : chiffres réels issus des réservations, mis à jour en temps réel par Convex. */
function Overview() {
  const { locale } = useLocale()
  const t = useT()
  const date = resolveDate(Route.useSearch().date)
  const { data } = useSuspenseQuery(summaryQuery(date))
  const { totals, offers } = data
  // La file « à servir » porte un abonnement Convex : montée seulement là où elle est affichée (bureau).
  const wide = useMinWidth(1280)
  return (
    <main className="workspace flex flex-col gap-6 py-6 md:py-8 xl:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-muted-foreground">{t('Pilotage')}</p>
          <h1 className="text-display">{t('Vue d’ensemble')}</h1>
          <p className="text-sm text-muted-foreground">{t('Chiffres réels des réservations, mis à jour en direct.')}</p>
        </div>
        <DayNav date={date} to="/admin" />
      </header>

      {offers.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SoupIcon />
                </EmptyMedia>
                <EmptyTitle>{t('Aucun plat publié')} {date === todayIso() ? t('aujourd’hui') : t('ce jour')}</EmptyTitle>
                <EmptyDescription>{t('Les chiffres s’afficheront dès qu’un plat de ce jour sera publié.')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link to="/admin/menus" search={{ week: weekStartOf(date) }}>
                    <ClipboardListIcon data-icon="inline-start" />
                    {t('Composer le menu')}
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bureau : cockpit, carte de service et indicateurs à gauche, file à servir à droite ; ailleurs, une colonne. */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              <ServiceHero date={date} dayLabel={serviceDayLabel(date, t, locale)} totals={totals} />
              <StatTiles date={date} totals={totals} />
            </div>
            {wide && <ServeQueue date={date} pendingCount={totals.confirmed} />}
          </div>
          <section aria-labelledby="par-plat" className="flex flex-col gap-3">
            <h2 id="par-plat" className="text-lg font-semibold tracking-tight">
              {t('Par plat')}
            </h2>
            <div className="xl:hidden">
              <OffersByService date={date} offers={offers} />
            </div>
            <div className="hidden xl:block">
              <OffersTable date={date} offers={offers} />
            </div>
          </section>
          <p className="text-xs text-muted-foreground">{t('Montants en crédits de démonstration : aucun encaissement réel n’est effectué.')}</p>
        </>
      )}
    </main>
  )
}
