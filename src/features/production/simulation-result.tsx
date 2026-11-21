import { ArrowDownIcon, ArrowUpIcon, CircleAlertIcon, HandIcon, PauseIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MaterialNeed, Recommendation, Simulation } from '../../../convex/lib/production/plan'
import { MaterialsList } from './quantities'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { useT } from '#/i18n/i18n'

const ADVICE: Record<Recommendation, { icon: LucideIcon; title: string; body: string }> = {
  reduce: { icon: ArrowDownIcon, title: 'Réduire la préparation', body: 'Préparer {after} portions au lieu de {before}.' },
  increase: { icon: ArrowUpIcon, title: 'Augmenter la préparation', body: 'Prévoir {extra} portions de plus, sous réserve de stock.' },
  hold: { icon: HandIcon, title: 'Maintenir la préparation', body: 'L’imprévu ne change pas le reste à préparer.' },
  stop: {
    icon: PauseIcon,
    title: 'Suspendre la production',
    body: '{surplus} portions déjà prêtes dépasseraient la demande : faire vérifier leur conservation par le chef.',
  },
}

const ROWS = [
  { key: 'demand', label: 'Demande' },
  { key: 'prepared', label: 'Préparé' },
  { key: 'missing', label: 'Reste à préparer' },
  { key: 'surplus', label: 'Surplus potentiel' },
] as const

/** Avant / après, recommandation déterministe, matière théorique et limites (stock et coût non connus). */
export function SimulationResult({ result, materials, capacity }: { result: Simulation; materials: Array<MaterialNeed> | null; capacity: number }) {
  const t = useT()
  const advice = ADVICE[result.recommendation]
  const Icon = advice.icon
  const delta = Math.max(result.avoidable, result.extra)
  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 text-left font-normal" />
            <th className="py-1 text-right font-normal">{t('Avant')}</th>
            <th className="py-1 text-right font-normal">{t('Après')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ROWS.map(({ key, label }) => (
            <tr key={key} className={key === 'missing' ? 'font-semibold' : undefined}>
              <th scope="row" className="py-2 text-left font-normal">
                {t(label)}
              </th>
              <td className="py-2 text-right">{result.before[key]}</td>
              <td className="py-2 text-right text-base">{result.after[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Alert>
        <Icon />
        <AlertTitle>{t(advice.title)}</AlertTitle>
        <AlertDescription>
          {t(advice.body, { before: result.before.missing, after: result.after.missing, extra: result.extra, surplus: result.after.surplus })}
        </AlertDescription>
      </Alert>

      {result.capacityOverflow > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            {t('Capacité dépassée de {n} portions (capacité {capacity}) : rien n’est promis au-delà.', {
              n: result.capacityOverflow,
              capacity,
            })}
          </AlertDescription>
        </Alert>
      )}

      {delta > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            {result.avoidable > 0
              ? t('Matière théorique non engagée ({n} portions)', { n: delta })
              : t('Matière supplémentaire à prévoir ({n} portions)', { n: delta })}
          </h3>
          <MaterialsList needs={materials} />
        </div>
      )}

      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
        {!result.preparedKnown && <li>{t('Préparé inconnu : le calcul repose sur votre hypothèse.')}</li>}
        <li>{t('Stock non renseigné : vérifier la réserve avant de lancer.')}</li>
        <li>{t('Coût matière non calculé : prix des ingrédients non renseignés.')}</li>
        <li>{t('Économie théorique, pas un gain mesuré : la matière déjà sortie ou cuite n’est pas récupérable.')}</li>
      </ul>
    </section>
  )
}
