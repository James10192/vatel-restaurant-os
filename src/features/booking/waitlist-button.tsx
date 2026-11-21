import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { BellIcon, BellOffIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

/** Plat complet : s'inscrire pour être prévenu si une place se libère (aucune réservation automatique). */
export function WaitlistButton({ menuItemId }: { menuItemId: Id<'menuItems'> }) {
  const t = useT()
  const { data: waiting } = useQuery(convexQuery(api.waitlist.mine, {}))
  const join = useServerAction(useMutation(api.waitlist.join))
  const leave = useServerAction(useMutation(api.waitlist.leave))
  const onList = waiting?.includes(menuItemId) ?? false
  const action = onList ? leave : join
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={onList ? 'ghost' : 'outline'} size="sm" disabled={action.pending || !waiting} onClick={() => void action.run({ menuItemId })}>
        {action.pending ? <Spinner data-icon="inline-start" /> : onList ? <BellOffIcon data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
        {onList ? t('Ne plus attendre') : t('Me prévenir')}
      </Button>
      {onList && <span className="text-xs text-muted-foreground">{t('Prévenu si une place se libère.')}</span>}
      <FormError message={action.error} />
    </div>
  )
}
