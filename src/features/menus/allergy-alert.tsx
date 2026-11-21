import { CircleHelpIcon, ShieldAlertIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { AllergyAlertInfo } from '../../../convex/lib/allergies'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'

export type AllergyAlertData = AllergyAlertInfo

/**
 * Alerte personnelle d'un plat, calculée par le serveur depuis les allergies déclarées dans le profil :
 * plat qui en contient (rouge), ou allergènes non renseignés (orange : impossible de garantir l'absence).
 */
export function AllergyAlert({ alert, className }: { alert?: AllergyAlertData; className?: string }) {
  const t = useT()
  if (!alert || (!alert.unknown && alert.matches.length === 0)) return null
  const danger = alert.matches.length > 0
  const Icon = danger ? ShieldAlertIcon : CircleHelpIcon
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-sm',
        danger ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-warning/30 bg-warning/10 text-warning',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">
          {danger ? t('Contient : {list}', { list: alert.matches.map((m) => t(m)).join(', ') }) : t('Allergènes non renseignés')}
        </span>
        <span className="text-xs opacity-90">
          {danger ? t('Signalé dans vos allergies.') : t('Impossible de vérifier vos allergies : demandez en cuisine avant de réserver.')}{' '}
          <Link to="/app/profile" className="underline underline-offset-2">
            {t('Mes allergies')}
          </Link>
        </span>
      </span>
    </div>
  )
}
