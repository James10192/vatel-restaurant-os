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
 * Visuel de repli d'un plat : une assiette stylisée portant ses initiales.
 * Aucune photo de plat n'est autorisée à ce jour ; on n'affiche jamais une image qui ne serait pas le vrai plat.
 */
export function DishVisual({ name, className }: { name: string; className?: string }) {
  return (
    <div aria-hidden className={cn('relative isolate grid place-items-center overflow-hidden bg-plate', className)}>
      <span className="absolute aspect-square h-[78%] rounded-full border border-plate-rim bg-card shadow-card" />
      <span className="absolute aspect-square h-[58%] rounded-full border border-dashed border-plate-rim" />
      <span className="relative text-[0.9em] font-semibold tracking-wide text-primary/80">{initials(name)}</span>
    </div>
  )
}
