import { cn } from '#/lib/utils'

/** Logo officiel Vatel (fichier d'origine vatel.ci, non modifié). */
export function BrandLogo({ className }: { className?: string }) {
  return <img src="/logo-vatel.svg" alt="Vatel" width={365} height={374} className={cn('h-16 w-auto', className)} />
}
