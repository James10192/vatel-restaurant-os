import { Skeleton } from '#/components/ui/skeleton'
import { useT } from '#/i18n/i18n'

/**
 * Silhouettes de page affichées dès qu'une navigation attend ses données : la nouvelle page apparaît tout de
 * suite à sa place (même gabarit que la vraie), au lieu de rester figé sur l'ancienne. Adaptatif comme les pages.
 */
type Variant = 'dashboard' | 'planner' | 'list'

function Header() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56 md:h-11 md:w-72" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Skeleton className="h-10 rounded-full sm:w-32" />
        <Skeleton className="h-10 rounded-full sm:w-32" />
      </div>
    </div>
  )
}

/** Vue d'ensemble, service, production : grand bloc du jour, tuiles, puis lignes par plat. */
function Dashboard() {
  return (
    <>
      <Skeleton className="h-11 w-full rounded-full md:w-96" />
      <Skeleton className="h-64 rounded-3xl md:h-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <Rows />
    </>
  )
}

/** Menus : chiffres de la semaine, puis une colonne par jour (cartes sur mobile). */
function Planner() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-44 rounded-3xl xl:h-80" />
        ))}
      </div>
    </>
  )
}

function Rows() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

const BODY: Record<Variant, () => React.JSX.Element> = { dashboard: Dashboard, planner: Planner, list: Rows }

export function PageSkeleton({ variant = 'list' }: { variant?: Variant }) {
  const t = useT()
  const Body = BODY[variant]
  return (
    <main aria-busy className="workspace flex flex-col gap-6 py-6 md:py-8 xl:py-10">
      <span className="sr-only">{t('Chargement de la page')}</span>
      <Header />
      <Body />
    </main>
  )
}

export const DashboardSkeleton = () => <PageSkeleton variant="dashboard" />
export const PlannerSkeleton = () => <PageSkeleton variant="planner" />
export const ListSkeleton = () => <PageSkeleton variant="list" />
