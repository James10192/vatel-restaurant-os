import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'

/** Briques partagées de la Vue d'ensemble : types, pourcentage, jauge de capacité, pastilles de statut. */
export type Summary = FunctionReturnType<typeof api.admin.daySummary>
export type Offer = Summary['offers'][number]
export type OrderStatus = 'confirmed' | 'picked_up' | 'cancelled'

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/**
 * Jauge segmentée d'une capacité : remis, à servir, libres. Une seule lecture, de gauche à droite,
 * au lieu de trois chiffres à additionner. `onBrand` : posée sur la surface bleu Vatel.
 */
export function CapacityBar({
  offer,
  onBrand = false,
  className,
}: {
  offer: Pick<Offer, 'pickedUp' | 'confirmed' | 'capacity'>
  onBrand?: boolean
  className?: string
}) {
  const t = useT()
  const segments = [
    { value: offer.pickedUp, className: onBrand ? 'bg-white' : 'bg-success' },
    { value: offer.confirmed, className: onBrand ? 'bg-vatel-sky' : 'bg-primary' },
  ]
  return (
    <div
      role="img"
      aria-label={t('{pickedUp} remis, {confirmed} à servir, sur {capacity} portions', {
        pickedUp: offer.pickedUp,
        confirmed: offer.confirmed,
        capacity: offer.capacity,
      })}
      className={cn('flex h-1.5 w-full overflow-hidden rounded-full', onBrand ? 'bg-white/15' : 'bg-muted', className)}
    >
      {segments.map((segment, i) => (
        <span
          key={i}
          className={cn('h-full motion-safe:transition-[width] motion-safe:duration-500', segment.className)}
          style={{ width: `${percent(segment.value, offer.capacity)}%` }}
        />
      ))}
    </div>
  )
}

/** Couleur de chaque statut, la même partout (tuiles, pastilles, jauges) : une seule convention à apprendre. */
export const TONES = {
  confirmed: { chip: 'bg-secondary text-primary', bar: 'bg-primary' },
  picked_up: { chip: 'bg-success-soft text-success', bar: 'bg-success' },
  cancelled: { chip: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground/40' },
  remaining: { chip: 'bg-vatel-sky/15 text-vatel-sky', bar: 'bg-vatel-sky' },
} as const
export type Tone = keyof typeof TONES

/** Pastille « 3 à servir » : chiffre en gras, libellé discret, couleur du statut. */
export function StatusPill({ tone, value, label }: { tone: Tone; value: number; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs', TONES[tone].chip)}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  )
}
