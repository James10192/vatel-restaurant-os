import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { addDays } from '../../../convex/lib/dates'
import { useAction } from 'convex/react'
import { CircleAlertIcon, EyeIcon, InfoIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Brief } from '../../../convex/copilot'
import type { Severity } from '../../../convex/lib/copilot/brief'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { dateFormat, formatDayShort, formatDecimal } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useMinWidth } from '#/lib/use-min-width'
import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/i18n/i18n'
import type { Locale } from '#/i18n/i18n'

/** Valeurs d'un point mises en forme pour la langue : décimales à la virgule en français, dates lisibles. */
function displayValues(values: Record<string, string | number>, locale: Locale) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, key === 'day' && typeof value === 'string' ? formatDayShort(value, locale) : typeof value === 'number' ? formatDecimal(value, locale) : value]),
  )
}

const SEVERITY: Record<Severity, { icon: LucideIcon; tone: string; label: string }> = {
  action: { icon: CircleAlertIcon, tone: 'text-destructive', label: 'À faire' },
  watch: { icon: EyeIcon, tone: 'text-warning', label: 'À surveiller' },
  info: { icon: InfoIcon, tone: 'text-muted-foreground', label: 'Pour information' },
}

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
  const rank = new Map(brief?.priorities.map((id, i) => [id, i]))
  const ordered = brief ? [...brief.points].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99)) : []

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
              {ordered.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('Rien à signaler pour ce jour.')}</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {ordered.map((point) => {
                    const { icon: Icon, tone, label } = SEVERITY[point.severity]
                    const priority = rank.get(point.id)
                    return (
                      <li key={point.id} className={cn('flex gap-3 rounded-2xl border p-3', priority !== undefined && 'border-primary')}>
                        <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', tone)} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            {priority !== undefined ? t('Priorité {n}', { n: priority + 1 }) : t(label)}
                          </span>
                          <span className="text-sm">{t(point.message, displayValues(point.values, locale))}</span>
                          {point.kind === 'tomorrow_target' && (
                            <Link
                              to="/admin/production"
                              search={{ date: addDays(date, 1) }}
                              className="text-sm font-semibold text-primary underline underline-offset-2"
                            >
                              {t('Ouvrir le plan de demain pour valider')}
                            </Link>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
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
