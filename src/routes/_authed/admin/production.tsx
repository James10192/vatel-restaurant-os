import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChefHatIcon } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { DayNav, parseDateSearch, resolveDate } from '#/features/admin/day'
import { PrepareView } from '#/features/production/prepare-view'
import { WasteView, wasteWeekQuery } from '#/features/production/waste-view'
import { SERVICE_LABELS, todayIso } from '#/lib/format'
import type { Service } from '#/lib/format'
import { pageTitle, useT } from '#/i18n/i18n'

const dayQuery = (date: string) => convexQuery(api.production.day, { date })
const VIEWS = ['preparer', 'pertes'] as const
type View = (typeof VIEWS)[number]
type Search = { date?: string; service?: Service; vue?: View }

function parseSearch(search: Record<string, unknown>): Search {
  return {
    ...parseDateSearch(search),
    service: search.service === 'lunch' || search.service === 'dinner' ? search.service : undefined,
    vue: VIEWS.find((v) => v === search.vue),
  }
}

export const Route = createFileRoute('/_authed/admin/production')({
  validateSearch: parseSearch,
  loaderDeps: ({ search }) => ({ date: resolveDate(search.date) }),
  loader: ({ context, deps }) =>
    Promise.all([context.queryClient.ensureQueryData(dayQuery(deps.date)), context.queryClient.ensureQueryData(wasteWeekQuery(deps.date))]),
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.locale, 'Production') }] }),
  component: Production,
})

/**
 * Smart Production (#5) et Smart Waste (#6) sur un seul écran : « combien préparer » puis « combien perdu ».
 * Chiffres réels de Convex, mis à jour en direct ; la simulation n'écrit rien.
 */
function Production() {
  const t = useT()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const date = resolveDate(search.date)
  const { data } = useSuspenseQuery(dayQuery(date))
  const offers = data.offers.filter((o) => !search.service || o.service === search.service)
  // Saisie réelle : seulement pour un jour commencé (le serveur revérifie).
  const canRecord = date <= todayIso()

  return (
    <main className="workspace flex flex-col gap-5 py-6 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-muted-foreground">{t('Cuisine')}</p>
          <h1 className="text-display">{t('Production')}</h1>
          <p className="text-sm text-muted-foreground">{t('Combien préparer maintenant, et ce qui a vraiment été perdu.')}</p>
        </div>
        <DayNav date={date} to="/admin/production" />
      </header>

      <Tabs value={search.vue ?? 'preparer'} onValueChange={(vue) => navigate({ search: (prev) => ({ ...prev, vue: vue as View }) })}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="preparer">{t('Préparer')}</TabsTrigger>
            <TabsTrigger value="pertes">{t('Pertes réelles')}</TabsTrigger>
          </TabsList>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t('Service')}
            value={search.service ?? 'all'}
            onValueChange={(value) => value && navigate({ search: (prev) => ({ ...prev, service: value === 'all' ? undefined : (value as Service) }) })}
          >
            <ToggleGroupItem value="all" className="px-3">
              {t('Tous')}
            </ToggleGroupItem>
            <ToggleGroupItem value="lunch" className="px-3">
              {t(SERVICE_LABELS.lunch)}
            </ToggleGroupItem>
            <ToggleGroupItem value="dinner" className="px-3">
              {t(SERVICE_LABELS.dinner)}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {offers.length === 0 ? (
          <Empty className="mt-4 rounded-3xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChefHatIcon />
              </EmptyMedia>
              <EmptyTitle>{t('Aucun plat publié ce jour')}</EmptyTitle>
              <EmptyDescription>{t('Publiez un menu pour suivre sa production.')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <TabsContent value="preparer" className="mt-4">
              <PrepareView offers={offers} canRecord={canRecord} />
            </TabsContent>
            <TabsContent value="pertes" className="mt-4">
              <WasteView date={date} offers={offers} canRecord={canRecord} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </main>
  )
}
