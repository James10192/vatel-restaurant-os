import { useState } from 'react'
import { useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ArrowLeftIcon, SparklesIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { useServerAction } from '#/lib/server-action'
import { useLocale, useT } from '#/i18n/i18n'
import type { PublishedItem } from '#/features/menus/meal-card'
import { SmartMenuForm, budgetValue } from './smart-menu-form'
import type { SmartRequest } from './smart-menu-form'
import { SuggestionResults } from './suggestion-results'
import { useHabits } from './use-habits'

export type Suggestion = FunctionReturnType<typeof api.smartMenu.suggest>

const EMPTY: SmartRequest = { days: [], budget: '', service: 'any', avoid: [], wish: '' }

/** Allergènes déclarés dans le menu affiché : choix proposés pour le filtre serveur. */
const declaredAllergens = (menu: Array<PublishedItem>) =>
  [...new Set(menu.flatMap(({ allergens: a }) => (a.status === 'declared' ? [...a.present, ...a.traces] : [])))].sort()

/**
 * Aide au choix (B1), en deux temps : la demande, puis les propositions. Les règles serveur décident ;
 * l'IA, facultative, ne fait que choisir et expliquer parmi des plats vérifiés. Aucune réservation
 * automatique : chaque proposition ouvre la confirmation habituelle.
 */
export function SmartMenuSheet({ days, menu, balanceXof }: { days: Array<string>; menu: Array<PublishedItem>; balanceXof: number }) {
  const t = useT()
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  // Null tant que l'usager n'a rien touché : la demande vient alors de ses habitudes (sinon vide).
  const [request, setRequest] = useState<SmartRequest | null>(null)
  const [result, setResult] = useState<Suggestion | null>(null)
  const { run, pending, error } = useServerAction(useAction(api.smartMenu.suggest))
  const daysWithMenu = new Set(menu.map((item) => item.date))
  const habits = useHabits(days, daysWithMenu)
  const current = request ?? habits.prefill ?? EMPTY
  // Une semaine changée entre-temps : on ne garde que les jours encore affichés.
  const value = { ...current, days: current.days.filter((d) => days.includes(d)) }

  async function onSubmit() {
    const suggestion = await run({
      days: value.days,
      budgetXof: budgetValue(value.budget),
      service: value.service,
      avoid: value.avoid,
      wish: value.wish,
      useAi: true,
      locale,
    })
    if (suggestion) setResult(suggestion)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="rounded-full" disabled={days.length === 0}>
          <SparklesIcon data-icon="inline-start" />
          {t('Aide au choix')}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="flex-row items-start gap-3 border-b p-4 pr-12">
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-vatel-navy text-white">
            <SparklesIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-lg">{result ? t('Vos propositions') : t('Aide au choix')}</SheetTitle>
            <SheetDescription>
              {result
                ? t('Vérifiées sur le menu publié. Réservez celles qui vous conviennent.')
                : t('Vos jours et votre budget : nous proposons des repas du menu publié.')}
            </SheetDescription>
          </div>
        </SheetHeader>

        {result ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <SuggestionResults result={result} balanceXof={balanceXof} />
            </div>
            <div className="border-t p-4">
              <Button variant="outline" size="lg" className="w-full" onClick={() => setResult(null)}>
                <ArrowLeftIcon data-icon="inline-start" />
                {t('Modifier ma demande')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col pt-5">
            <SmartMenuForm
              days={days}
              daysWithMenu={daysWithMenu}
              allergens={declaredAllergens(menu)}
              value={value}
              onChange={(patch) => setRequest({ ...value, ...patch })}
              habit={{ saved: habits.saved, saving: habits.saving, error: habits.error, onSave: () => void habits.remember(value) }}
              onSubmit={onSubmit}
              pending={pending}
              error={error}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
