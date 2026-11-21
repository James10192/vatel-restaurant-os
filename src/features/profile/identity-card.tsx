import { useSuspenseQuery } from '@tanstack/react-query'
import { BuildingIcon, ClockIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { initials } from '#/components/shell/nav-model'
import { ROLE_LABELS, currentUserQuery } from '#/lib/session'

/** Identité lue sur le serveur : nom, e-mail, rôle et établissement (jamais modifiables par l'usager). */
export function IdentityCard() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  if (!user) return null
  return (
    <Card className="rounded-3xl">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 text-lg">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        {user.membership ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge>{ROLE_LABELS[user.membership.role]}</Badge>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BuildingIcon aria-hidden className="size-4" />
              {user.membership.canteenName}
            </span>
          </div>
        ) : (
          <Alert>
            <ClockIcon />
            <AlertTitle>Compte en attente de rattachement</AlertTitle>
            <AlertDescription>
              L’administration de votre établissement doit valider votre compte.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
