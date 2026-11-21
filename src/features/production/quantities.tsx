import { roundQty } from '../../../convex/lib/production/plan'
import type { MaterialNeed } from '../../../convex/lib/production/plan'
import { useT } from '#/i18n/i18n'

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** Affichage seulement : 2400 g devient « 2,4 kg », 1500 ml « 1,5 L ». Les calculs gardent la valeur exacte. */
export function formatQty(value: number, unit: string): string {
  const key = unit.trim().toLowerCase()
  if ((key === 'g' || key === 'ml') && value >= 1000) return `${nf.format(roundQty(value / 1000))} ${key === 'g' ? 'kg' : 'L'}`
  return `${nf.format(roundQty(value))} ${unit}`
}

/**
 * Liste de matières : brut (sortie de stock) et net après pertes de préparation de la fiche technique.
 * `null` = fiche absente : on le dit, on n'affiche jamais zéro.
 */
export function MaterialsList({ needs, emptyLabel }: { needs: Array<MaterialNeed> | null; emptyLabel?: string }) {
  const t = useT()
  if (needs === null) return <p className="text-sm text-muted-foreground">{t('Fiche technique absente : besoin en matière inconnu.')}</p>
  if (needs.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel ?? t('Aucune matière.')}</p>
  return (
    <ul className="divide-y rounded-2xl border">
      {needs.map((need) => (
        <li key={`${need.ingredientId}:${need.unitId}`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{need.name}</span>
          <span className="flex shrink-0 flex-col items-end tabular-nums">
            <span className="font-semibold">{formatQty(need.gross, need.unit)}</span>
            {need.net < need.gross && (
              <span className="text-xs text-muted-foreground">{t('{qty} net', { qty: formatQty(need.net, need.unit) })}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
