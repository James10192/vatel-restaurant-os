import { useState } from 'react'
import { useAction } from 'convex/react'
import { RefreshCwIcon, SparklesIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Brief } from '../../../convex/copilot'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { dateFormat } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useMinWidth } from '#/lib/use-min-width'
import { useLocale, useT } from '#/i18n/i18n'
import { PointList } from './point-list'

/**
 * Copilote cuisine : les points d'attention du jour (calculés sans IA, toujours affichés) et, si l'IA est
 * disponible, un résumé et l'ordre des priorités, dont chaque chiffre a été revérifié par le serveur.
 */
export function CopilotSheet({ date }: { date: string }) {
  const t = useT()
  const { locale } = useLocale()
  const wide = useMinWidth(768)
  const [brief, setBrief] = useState<(Brief & { at: number }) | null>(null)
  const ask = useServerAction(useAction(api.copilot.brief))
  const load = async () => {
    const result = await ask.run({ date, useAi: true, locale })
    if (result) setBrief({ ...result, at: Date.now() })
  }
  const time = dateFormat(locale, { hour: '2-digit', minute: '2-digit' })

  return (
    <Sheet
      onOpenChange={(open) => {
        setBrief(null)
        if (open) void load()
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline">
          <SparklesIcon data-icon="inline-start" />
          {t('Copilote')}
        </Button>
      </SheetTrigger>
      <SheetContent side={wide ? 'right' : 'bottom'} className="max-h-[92dvh] overflow-y-auto data-[side=bottom]:rounded-t-3xl data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('Copilote cuisine')}</SheetTitle>
          <SheetDescription>{t('Ce qui demande votre attention, d’après les chiffres réels de ce jour.')}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <FormError message={ask.error} />
          {!brief ? (
            ask.pending && (
              <div className="flex flex-col gap-3" aria-busy>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
            )
          ) : (
            <>
              {brief.summary ? (
                <section className="flex flex-col gap-2 rounded-2xl bg-vatel-navy p-4 text-white">
                  <Badge className="self-start bg-white/15 text-white">{t('Résumé IA, chiffres vérifiés')}</Badge>
                  <p className="text-sm leading-relaxed">{brief.summary}</p>
                </section>
              ) : (
                brief.notice && <p className="text-xs text-muted-foreground">{t(brief.notice)}</p>
              )}
              <PointList points={brief.points} priorities={brief.priorities} date={date} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t('Calculé à {time}', { time: time.format(brief.at) })}</span>
                <Button variant="ghost" size="sm" disabled={ask.pending} onClick={() => void load()}>
                  <RefreshCwIcon data-icon="inline-start" />
                  {t('Actualiser')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
