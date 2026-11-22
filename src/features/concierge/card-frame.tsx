import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { useT } from '#/i18n/i18n'

/** Cadre commun des cartes de l'assistant : titre (déjà traduit), badge d'origine facultatif (règles, simulation). */
export function CardFrame({ title, icon: Icon, badge, children }: { title: string; icon?: LucideIcon; badge?: string; children: ReactNode }) {
  const t = useT()
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-background/60 p-3 shadow-xs">
      <header className="flex flex-wrap items-center gap-2">
        {Icon && <Icon aria-hidden className="size-4 text-primary" />}
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge && (
          <Badge variant="outline" className="ml-auto">
            {t(badge)}
          </Badge>
        )}
      </header>
      {children}
    </section>
  )
}
