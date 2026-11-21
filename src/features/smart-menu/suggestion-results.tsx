import { Link } from '@tanstack/react-router'
import { CalendarXIcon, CircleHelpIcon, InfoIcon, SparklesIcon, TriangleAlertIcon } from 'lucide-react'
import { DishVisual } from '#/components/dish-visual'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui/empty'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import { useNow } from '#/lib/use-now'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { AllergenBadges } from '#/features/menus/allergen-badges'
import type { Suggestion } from './smart-menu-sheet'

const UNCOVERED_LABELS = {
  no_menu: 'aucun menu publié',
  unavailable: 'complet, réservations closes ou repas déjà réservé',
  allergens: 'aucun plat compatible avec les allergènes à éviter',
  budget: 'hors budget',
} as const

/** Synthèse : total proposé face au budget, origine (IA vérifiée ou calcul), alerte de solde. */
function Summary({ result, balanceXof }: { result: Suggestion; balanceXof: number }) {
  const ratio = result.budgetXof > 0 ? Math.min(result.totalXof / result.budgetXof, 1) : 0
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-vatel-navy p-5 text-white">
      <div aria-hidden className="absolute -top-12 -right-12 -z-10 size-40 rounded-full border-[20px] border-white/10" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-white/70">Total proposé</p>
        <Badge variant="secondary" className="gap-1">
          {result.source === 'ai' && <SparklesIcon />}
          {result.source === 'ai' ? 'Choix IA vérifié' : 'Calcul sans IA'}
        </Badge>
      </div>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatXof(result.totalXof)}</p>
      <p className="text-sm text-white/80 tabular-nums">sur un budget de {formatXof(result.budgetXof)}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="img" aria-label={`${Math.round(ratio * 100)} % du budget`}>
        <span className="block h-full rounded-full bg-vatel-sky" style={{ width: `${ratio * 100}%` }} />
      </div>
      {result.totalXof > balanceXof && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <TriangleAlertIcon className="size-4 shrink-0 text-vatel-sky" />
          <span>
            Solde actuel de {formatXof(balanceXof)} : insuffisant pour tout réserver.{' '}
            <Link to="/app/wallet" className="font-semibold underline underline-offset-2">
              Recharger
            </Link>
          </span>
        </p>
      )}
    </section>
  )
}

/** Propositions vérifiées par le serveur. Chaque réservation passe par la confirmation habituelle. */
export function SuggestionResults({ result, balanceXof }: { result: Suggestion; balanceXof: number }) {
  const now = useNow()
  return (
    <section aria-label="Propositions" className="flex flex-col gap-4" aria-live="polite">
      <Summary result={result} balanceXof={balanceXof} />
      {result.notice && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{result.notice}</AlertDescription>
        </Alert>
      )}

      {result.picks.length === 0 ? (
        <Empty className="rounded-3xl border">
          <EmptyHeader>
            <EmptyTitle>Aucun repas ne correspond</EmptyTitle>
            <EmptyDescription>Essayez d’autres jours ou un budget plus élevé, ou parcourez le menu.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.picks.map((pick) => (
            <li key={pick.menuItemId} className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <DishVisual name={pick.dishName} className="size-14 shrink-0 rounded-2xl text-sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground first-letter:uppercase">
                    {formatDayLong(pick.date)} · {SERVICE_LABELS[pick.service]}
                  </span>
                  <span className="leading-snug font-semibold">{pick.dishName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pick.remaining} portion{pick.remaining > 1 ? 's' : ''} restante{pick.remaining > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-lg font-bold whitespace-nowrap text-primary tabular-nums">{formatXof(pick.priceXof)}</span>
              </div>
              {pick.reason && (
                <p className="flex gap-2 rounded-2xl bg-secondary/70 px-3 py-2 text-sm">
                  <SparklesIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{pick.reason}</span>
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <AllergenBadges allergens={pick.allergens} />
                {now < pick.bookableUntil && pick.remaining > 0 ? (
                  <BookMealDialog meal={{ ...pick, _id: pick.menuItemId }} balanceXof={balanceXof} />
                ) : (
                  <span className="text-xs text-muted-foreground">Réservations closes</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Motif par jour non couvert, affiché même sans aucune proposition (sinon l'écran vide ne s'explique pas). */}
      {result.uncovered.length > 0 && (
        <ul className="flex flex-col gap-2">
          {result.uncovered.map((day) => (
            <li key={day.date} className="flex items-center gap-3 rounded-3xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              <CalendarXIcon aria-hidden className="size-4 shrink-0" />
              <span className="first-letter:uppercase">
                {formatDayLong(day.date)} : {UNCOVERED_LABELS[day.reason]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {result.excludedUnknownAllergens > 0 && (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <CircleHelpIcon className="mt-0.5 size-4 shrink-0" />
          {result.excludedUnknownAllergens} plat{result.excludedUnknownAllergens > 1 ? 's' : ''} écarté
          {result.excludedUnknownAllergens > 1 ? 's' : ''} : allergènes non renseignés, donc non vérifiés.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Les allergènes viennent de la fiche du plat. Un allergène non renseigné n’est pas vérifié : en cas de doute, demandez au
        service restauration.
      </p>
    </section>
  )
}
