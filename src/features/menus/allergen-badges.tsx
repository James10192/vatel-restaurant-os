import { CircleHelpIcon, TriangleAlertIcon } from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '#/components/ui/badge'
import { useT } from '#/i18n/i18n'

/** Allergènes déclarés. « Non renseignés » est affiché explicitement : jamais confondu avec « aucun ». */
export function AllergenBadges({ allergens }: { allergens: Doc<'dishes'>['allergens'] }) {
  const t = useT()
  if (allergens.status === 'unknown') {
    return (
      <Badge variant="outline" className="w-fit">
        <CircleHelpIcon />
        {t('Allergènes non renseignés')}
      </Badge>
    )
  }
  if (allergens.present.length === 0 && allergens.traces.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('Aucun allergène déclaré')}</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {allergens.present.map((name) => (
        <Badge key={name} variant="secondary">
          <TriangleAlertIcon />
          {name}
        </Badge>
      ))}
      {allergens.traces.map((name) => (
        <Badge key={name} variant="outline">
          {t('Traces :')} {name}
        </Badge>
      ))}
    </div>
  )
}
