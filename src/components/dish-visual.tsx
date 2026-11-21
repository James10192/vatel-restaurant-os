import { cn } from '#/lib/utils'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || name.slice(0, 1).toUpperCase()

/**
 * Visuel d'un plat : la photo RÉELLE envoyée par la cuisine quand elle existe, sinon une assiette stylisée
 * portant ses initiales. Jamais de photo d'illustration : on n'affiche pas une image qui ne serait pas le vrai plat.
 */
export function DishVisual({ name, photoUrl, className }: { name: string; photoUrl?: string; className?: string }) {
  if (photoUrl) {
    return (
      <div className={cn('relative isolate overflow-hidden bg-plate', className)}>
        {/* Décorative : le nom du plat est toujours écrit à côté. */}
        <img src={photoUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      </div>
    )
  }
  return (
    <div aria-hidden className={cn('relative isolate grid place-items-center overflow-hidden bg-plate', className)}>
      <span className="absolute aspect-square h-[78%] rounded-full border border-plate-rim bg-card shadow-card" />
      <span className="absolute aspect-square h-[58%] rounded-full border border-dashed border-plate-rim" />
      <span className="relative text-[0.9em] font-semibold tracking-wide text-primary/80">{initials(name)}</span>
    </div>
  )
}
