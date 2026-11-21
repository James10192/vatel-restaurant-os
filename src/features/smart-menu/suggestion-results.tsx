import { CircleHelpIcon, InfoIcon, SparklesIcon } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui/empty'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import { useNow } from '#/lib/use-now'
import { BookMealDialog } from '#/features/booking/book-meal-dialog'
import { AllergenBadges } from '#/features/menus/allergen-badges'
import type { Suggestion } from './smart-menu-sheet'
import { useT , useLocale } from '#/i18n/i18n'

const UNCOVERED_LABELS = {
  no_menu: 'aucun menu publié',
  unavailable: 'complet, réservations closes ou repas déjà réservé',
  allergens: 'aucun plat compatible avec les allergènes à éviter',
  budget: 'hors budget',
} as const

/** Suggestions vérifiées par le serveur. Chaque réservation passe par la confirmation habituelle. */
export function SuggestionResults({ result, balanceXof }: { result: Suggestion; balanceXof: number }) {
  const { locale } = useLocale()
  const t = useT()
  const now = useNow()
  return (
    <section aria-labelledby="smart-results" className="flex flex-col gap-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="smart-results" className="text-lg font-semibold">
          {t('Suggestions')}
        </h3>
        <Badge variant={result.source === 'ai' ? 'default' : 'secondary'}>
          {result.source === 'ai' && <SparklesIcon />}
          {result.source === 'ai' ? t('Choix IA vérifié') : 'Calcul sans IA'}
        </Badge>
      </div>
      {result.notice && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{result.notice}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm">
        {t('Total')} <strong className="tabular-nums">{formatXof(result.totalXof)}</strong> {t('pour un budget de')}{' '}
        <span className="tabular-nums">{formatXof(result.budgetXof)}</span>
        {result.totalXof > balanceXof && <span className="text-warning"> {t('· solde actuel insuffisant pour tout réserver')}</span>}
      </p>
      {result.picks.length === 0 ? (
        <Empty className="rounded-2xl border">
          <EmptyHeader>
            <EmptyTitle>{t('Aucun repas ne correspond')}</EmptyTitle>
            <EmptyDescription>{t('Essayez d’autres jours ou un budget plus élevé, ou parcourez le menu.')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.picks.map((pick) => (
            <li key={pick.menuItemId}>
              <Card className="gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground first-letter:uppercase">
                      {formatDayLong(pick.date, locale)} · {t(SERVICE_LABELS[pick.service])}
                    </span>
                    <span className="font-semibold">{pick.dishName}</span>
                  </div>
                  <span className="font-bold whitespace-nowrap text-primary tabular-nums">{formatXof(pick.priceXof)}</span>
                </div>
                <AllergenBadges allergens={pick.allergens} />
                {pick.reason && <p className="text-sm text-muted-foreground">{t('Pourquoi :')} {pick.reason}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {t(pick.remaining > 1 ? '{n} portions restantes' : '{n} portion restante', { n: pick.remaining })}
                  </span>
                  {now < pick.bookableUntil && pick.remaining > 0 ? (
                    <BookMealDialog meal={{ ...pick, _id: pick.menuItemId }} balanceXof={balanceXof} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('Réservations closes')}</span>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {result.uncovered.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {result.uncovered.map((day) => (
            <li key={day.date} className="first-letter:uppercase">
              {formatDayLong(day.date, locale)} : {t(UNCOVERED_LABELS[day.reason])}
            </li>
          ))}
        </ul>
      )}
      {result.excludedUnknownAllergens > 0 && (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <CircleHelpIcon className="mt-0.5 size-4 shrink-0" />
          {t(
            result.excludedUnknownAllergens > 1
              ? '{n} plats écartés : allergènes non renseignés, donc non vérifiés.'
              : '{n} plat écarté : allergènes non renseignés, donc non vérifiés.',
            { n: result.excludedUnknownAllergens },
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('Les allergènes affichés viennent de la fiche du plat. Un allergène non renseigné n’est pas vérifié : en cas de doute, demandez au service restauration.')}
      </p>
    </section>
  )
}
