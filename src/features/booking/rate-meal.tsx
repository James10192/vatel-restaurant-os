import { useMutation } from 'convex/react'
import { StarIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useServerAction } from '#/lib/server-action'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'

/** Note d'un repas retiré, 1 à 5 étoiles (groupe radio accessible au clavier). Modifiable, jamais de texte libre. */
export function RateMeal({ bookingId, score }: { bookingId: Id<'bookings'>; score: number | undefined }) {
  const t = useT()
  const rate = useServerAction(useMutation(api.ratings.rate))
  return (
    <div role="radiogroup" aria-label={t('Noter ce repas')} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={score === value}
          aria-label={t(value > 1 ? '{n} étoiles' : '{n} étoile', { n: value })}
          disabled={rate.pending}
          onClick={() => void rate.run({ bookingId, score: value })}
          className="rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StarIcon className={cn('size-5', score !== undefined && value <= score ? 'fill-current text-primary' : 'text-muted-foreground')} />
        </button>
      ))}
      {rate.error && <span className="ml-2 text-xs text-destructive">{t(rate.error)}</span>}
    </div>
  )
}
