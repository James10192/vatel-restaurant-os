import { ArrowRightIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const reveal = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both'

/** Écran d'accueil animé : plein écran sur mobile, panneau gauche sur ordinateur. */
export function AuthIntro({ onStart, className }: { onStart: () => void; className?: string }) {
  return (
    <section className={cn('relative flex flex-col overflow-hidden bg-primary p-6 text-primary-foreground md:p-10', className)}>
      <PlateMotif />
      <div className={cn('relative flex items-center gap-3 duration-500', reveal)}>
        <span className="rounded-lg bg-background p-1.5">
          <BrandLogo className="h-12" />
        </span>
        <span className="text-sm font-semibold">Restauration</span>
      </div>
      <div className="relative mt-auto flex flex-col gap-4 pb-6 md:mb-auto md:mt-auto">
        <h1 className={cn('text-4xl font-bold leading-tight delay-150 duration-700 md:text-5xl', reveal)}>
          Vos repas,
          <br />
          réservés en
          <br />
          quelques secondes.
        </h1>
        <p className={cn('max-w-xs text-primary-foreground/80 delay-300 duration-700', reveal)}>
          Menus de la semaine, réservations et solde, au même endroit.
        </p>
      </div>
      <Button
        size="lg"
        variant="secondary"
        className={cn('relative justify-between delay-500 duration-700 md:hidden', reveal)}
        onClick={onStart}
      >
        Commencer
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </section>
  )
}

/** Motif décoratif d'assiette (cercles concentriques), purement visuel. */
function PlateMotif() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-24 top-1/4 size-80 rounded-full border-[28px] border-primary-foreground/10 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:fade-in motion-safe:duration-1000 md:size-[28rem]"
    >
      <div className="absolute inset-10 rounded-full border-2 border-primary-foreground/15" />
    </div>
  )
}
