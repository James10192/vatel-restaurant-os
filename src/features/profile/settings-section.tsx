import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { cn } from '#/lib/utils'

/** Bloc de réglage de la page Profil : icône, titre, phrase d'explication, contenu. */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

/** Ligne d'état sobre (texte d'information ou de confirmation), annoncée aux lecteurs d'écran. */
export function StatusLine({
  icon: Icon,
  children,
  tone = 'muted',
}: {
  icon: LucideIcon
  children: ReactNode
  tone?: 'muted' | 'success'
}) {
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2 text-sm',
        tone === 'success' ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
