import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BuildingIcon, ClockIcon, PencilIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { initials } from '#/components/shell/nav-model'
import { ROLE_LABELS, currentUserQuery } from '#/lib/session'
import { RenameForm } from './rename-form'
import { useT } from '#/i18n/i18n'

/** Identité lue sur le serveur. Le nom est modifiable ; e-mail, rôle et établissement ne le sont pas. */
export function IdentityCard() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const [editing, setEditing] = useState(false)
  if (!user) return null
  return (
    <Card className="rounded-3xl">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 text-lg">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          {!editing && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Modifier le nom')}
              title={t('Modifier le nom')}
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
            </Button>
          )}
        </div>
        {editing && (
          <RenameForm current={user.name} onDone={() => setEditing(false)} />
        )}
        {user.membership ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge>{t(ROLE_LABELS[user.membership.role])}</Badge>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BuildingIcon aria-hidden className="size-4" />
              {user.membership.canteenName}
            </span>
          </div>
        ) : (
          <Alert>
            <ClockIcon />
            <AlertTitle>{t('Compte en attente de rattachement')}</AlertTitle>
            <AlertDescription>
              {t('L’administration de votre établissement doit valider votre compte.')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
