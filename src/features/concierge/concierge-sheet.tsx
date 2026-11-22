import { useSuspenseQuery } from '@tanstack/react-query'
import { MessageCircleIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react'
import { audienceOf } from '../../../convex/lib/concierge/quick'
import type { Audience } from '../../../convex/lib/concierge/quick'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { currentUserQuery } from '#/lib/session'
import { useMinWidth } from '#/lib/use-min-width'
import { useT } from '#/i18n/i18n'
import { Composer, Thread } from './conversation'
import { useConcierge } from './use-concierge'

/** Questions d'exemple (envoyées à l'IA dans la langue de l'interface). */
const EXAMPLES: Record<Audience, Array<string>> = {
  student: ['J’ai 4 000 FCFA pour 2 jours, que me proposes-tu ?', 'Qu’est-ce qu’il y a au menu demain ?', 'Quelles sont mes prochaines réservations ?'],
  kitchen: ['Demain, combien de repas faut-il prévoir ?', 'Simule 30 absences avec 50 portions préparées aujourd’hui', 'Qu’est-ce qui demande mon attention aujourd’hui ?'],
}

const INTRO: Record<Audience, string> = {
  student: 'Menu, places, prix, solde et réservations, lus en direct. Je propose, vous confirmez.',
  kitchen: 'Chiffres réels du jour et simulations d’imprévus. Rien n’est modifié sans vous.',
}

/**
 * Assistant conversationnel (#45) : questions libres à l'IA, qui lit les données autorisées pour le rôle et
 * répond avec des cartes vérifiées. Raccourcis sans IA toujours disponibles. Conversation non conservée.
 */
export function ConciergeSheet({ look = 'pill' }: { look?: 'pill' | 'toolbar' }) {
  const t = useT()
  const wide = useMinWidth(768)
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const audience = audienceOf(user?.membership?.role)
  const concierge = useConcierge()
  if (!audience) return null
  const empty = concierge.entries.length === 0
  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* Même allure que les boutons voisins : pastille dans l'espace repas, bouton d'outil dans la gestion. */}
        <Button variant={look === 'pill' ? 'secondary' : 'outline'} size={look === 'pill' ? 'sm' : 'default'} className={look === 'pill' ? 'rounded-full' : undefined}>
          <MessageCircleIcon data-icon="inline-start" />
          {t('Assistant')}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className="flex h-[92dvh] flex-col gap-0 p-0 data-[side=bottom]:rounded-t-3xl data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b p-4 pr-12">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-vatel-navy text-white">
            <SparklesIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle>{t('Assistant Vatel')}</SheetTitle>
            <SheetDescription className="truncate">{t('Réponses vérifiées sur vos données')}</SheetDescription>
          </div>
          {!empty && (
            <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('Nouvelle conversation')} disabled={concierge.pending} onClick={concierge.reset}>
              <RotateCcwIcon />
            </Button>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {empty ? (
            <div className="flex flex-col gap-5 pt-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{t('Bonjour, que puis-je faire pour vous ?')}</h2>
                <p className="text-sm text-muted-foreground">{t(INTRO[audience])}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {EXAMPLES[audience].map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      disabled={concierge.pending}
                      onClick={() => void concierge.send(t(example))}
                      className="press w-full rounded-2xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {t(example)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Thread entries={concierge.entries} pending={concierge.pending} />
          )}
        </div>

        <Composer audience={audience} concierge={concierge} />
      </SheetContent>
    </Sheet>
  )
}
