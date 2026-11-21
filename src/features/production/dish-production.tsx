import { FlaskConicalIcon, PlusIcon } from 'lucide-react'
import { ProductionRail } from './production-rail'
import { RecordPreparedDialog } from './record-dialogs'
import { SimulateSheet } from './simulate-sheet'
import { baselineOf } from './types'
import type { ProductionOffer } from './types'
import { situationOf } from '../../../convex/lib/production/plan'
import { Button } from '#/components/ui/button'
import { SERVICE_LABELS, dateFormat } from '#/lib/format'
import { useLocale, useT } from '#/i18n/i18n'

/**
 * Un plat sur le passe : le chiffre qui compte (reste à préparer), la piste demande / préparé,
 * puis les deux gestes du chef : saisir ce qui sort, simuler un imprévu.
 */
export function DishProduction({ offer, canRecord }: { offer: ProductionOffer; canRecord: boolean }) {
  const t = useT()
  const { locale } = useLocale()
  const situation = situationOf(baselineOf(offer))
  const missing = situation?.missing ?? null
  const surplus = situation?.surplus ?? 0
  const time = dateFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  return (
    <article className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-card sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{offer.dishName}</h3>
          <p className="text-xs text-muted-foreground">
            {t(SERVICE_LABELS[offer.service])}, {t('capacité {n}', { n: offer.capacity })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {missing === null ? (
            <p className="text-sm font-semibold text-warning">{t('Préparé inconnu')}</p>
          ) : (
            <p className="text-3xl leading-none font-bold tracking-tight tabular-nums">{missing}</p>
          )}
          <p className="text-xs text-muted-foreground">{missing === null ? t('à saisir en cuisine') : t('reste à préparer')}</p>
          {surplus > 0 && <p className="text-xs font-semibold text-destructive">{t('{n} prêtes au-delà des réservations', { n: surplus })}</p>}
        </div>
      </header>

      <ProductionRail pickedUp={offer.pickedUp} confirmed={offer.confirmed} prepared={offer.prepared} capacity={offer.capacity} />

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Figure dot="bg-success" label={t('Remis')} value={offer.pickedUp} />
        <Figure dot="bg-primary" label={t('À servir')} value={offer.confirmed} />
        <Figure
          dot="bg-[var(--vatel-bleu-2)]"
          label={t('Préparé')}
          value={offer.prepared ?? '?'}
          note={offer.preparedAt ? t('à {time}', { time: time.format(offer.preparedAt) }) : undefined}
        />
      </dl>

      <footer className="flex flex-wrap gap-2">
        {canRecord && (
          <RecordPreparedDialog
            offer={offer}
            trigger={
              <Button variant="outline" size="sm">
                <PlusIcon data-icon="inline-start" />
                {t('Saisir le préparé')}
              </Button>
            }
          />
        )}
        <SimulateSheet
          offer={offer}
          trigger={
            <Button size="sm">
              <FlaskConicalIcon data-icon="inline-start" />
              {t('Simuler un imprévu')}
            </Button>
          }
        />
      </footer>
    </article>
  )
}

function Figure({ dot, label, value, note }: { dot: string; label: string; value: number | string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden className={`size-2 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className="text-sm font-semibold tabular-nums">
        {value}
        {note && <span className="ml-1 text-xs font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  )
}
