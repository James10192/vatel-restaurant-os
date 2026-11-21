import { cn } from '#/lib/utils'

const STATUS = {
  published: { label: 'Publié', className: 'bg-success-soft text-success' },
  draft: { label: 'Brouillon', className: 'bg-warning-soft text-warning' },
} as const

/** Statut d'une offre : pastille douce + point, lisible sans dépendre de la seule couleur. */
export function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const { label, className } = STATUS[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
