import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'

/** Logo officiel Vatel (fichier d'origine vatel.ci, non modifié). */
export function BrandLogo({ className }: { className?: string }) {
  const t = useT()
  return <img src="/logo-vatel.svg" alt={t('Vatel')} width={365} height={374} className={cn('h-16 w-auto', className)} />
}
