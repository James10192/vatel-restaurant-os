import { BrandLogo } from '#/components/brand-logo'
import { cn } from '#/lib/utils'
import { SlideToStart } from './slide-to-start'

const reveal = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both'

/** Écran d'accueil : photo plein cadre sur mobile, panneau gauche sur ordinateur. */
export function AuthIntro({ started, onStart, className }: { started: boolean; onStart: () => void; className?: string }) {
  return (
    <section className={cn('relative isolate flex min-h-svh flex-col overflow-hidden bg-primary text-primary-foreground', className)}>
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/accueil-chef-1400.webp" />
        <img
          src="/images/accueil-chef-720.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-x-0 top-0 -z-10 h-[58%] w-full object-cover object-bottom md:h-full md:object-[50%_88%] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-110 motion-safe:duration-[1600ms] motion-safe:ease-out"
        />
      </picture>
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-primary from-45% via-primary/20 via-60% to-transparent md:bg-linear-to-r md:from-primary md:from-10% md:via-primary/70 md:via-45% md:to-primary/10" />

      <header className={cn('flex items-center gap-3 p-6 duration-700 md:p-10', reveal)}>
        <span className="rounded-lg bg-background p-1.5 shadow-sm">
          <BrandLogo className="h-11" />
        </span>
        <span className="text-xs font-semibold tracking-[0.2em] uppercase">Restauration</span>
      </header>

      <div className="mt-auto flex max-w-2xl flex-col gap-6 p-6 md:p-12">
        <p className={cn('text-xs font-semibold tracking-[0.2em] text-primary-foreground/70 uppercase delay-200 duration-700', reveal)}>
          Hotel &amp; Tourism Business School
        </p>
        <h1 className={cn('text-4xl leading-[1.1] font-bold text-balance delay-300 duration-700 md:text-6xl', reveal)}>
          L'art de recevoir, jusque dans votre assiette.
        </h1>
        <p className={cn('max-w-sm text-primary-foreground/80 delay-500 duration-700', reveal)}>
          Consultez les menus de la semaine, réservez votre repas et suivez votre solde en quelques gestes.
        </p>
        <SlideToStart
          label="Glisser pour commencer"
          onComplete={onStart}
          className={cn('max-w-md delay-700 duration-700', reveal, started && 'hidden')}
        />
      </div>
    </section>
  )
}
