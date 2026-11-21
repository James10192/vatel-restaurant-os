import { BrandLogo } from '#/components/brand-logo'
import { LanguageToggle } from '#/components/language-toggle'
import { ThemeToggle } from '#/components/theme-toggle'
import { cn } from '#/lib/utils'
import { SlideToStart } from './slide-to-start'
import { useT } from '#/i18n/i18n'

const reveal = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both'

/** Écran d'accueil : photo plein cadre sur mobile, panneau gauche sur ordinateur. */
export function AuthIntro({ started, onStart, className }: { started: boolean; onStart: () => void; className?: string }) {
  const t = useT()
  return (
    <section className={cn('relative isolate flex min-h-svh flex-col overflow-hidden bg-vatel-navy text-white', className)}>
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/accueil-chef-1400.webp" />
        <img
          src="/images/accueil-chef-720.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-x-0 top-0 -z-10 h-[58%] w-full object-cover object-bottom md:h-full md:object-[50%_88%] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-110 motion-safe:duration-[1600ms] motion-safe:ease-out"
        />
      </picture>
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-vatel-navy from-45% via-vatel-navy/20 via-60% to-transparent md:from-15% md:via-vatel-navy/75 md:via-55% md:to-vatel-navy/25" />

      <header className={cn('flex items-center gap-3 p-6 duration-700 md:p-10', reveal)}>
        <span className="rounded-lg bg-white p-1.5 shadow-sm">
          <BrandLogo className="h-11" />
        </span>
        <span className="text-xs font-semibold tracking-[0.2em] uppercase">{t('Restauration')}</span>
        {!started && (
          <div className="ml-auto flex gap-2">
            <LanguageToggle onImage />
            <ThemeToggle onImage />
          </div>
        )}
      </header>

      <div className="mt-auto flex w-full flex-col items-center gap-5 px-6 pt-6 pb-10 text-center md:px-12 md:pb-14">
        <p className={cn('flex items-center gap-3 text-eyebrow text-white/90 drop-shadow-md delay-200 duration-700', reveal)}>
          <span aria-hidden className="h-px w-8 bg-white/40" />
          {t('Hotel &amp; Tourism Business School')}
          <span aria-hidden className="h-px w-8 bg-white/40" />
        </p>
        <h1
          className={cn(
            'max-w-4xl text-[2.5rem] leading-[1.05] font-bold tracking-[-0.03em] delay-300 duration-700 md:text-6xl lg:text-7xl',
            reveal,
          )}
        >
          {t('L’art de recevoir,')}
          <span className="block text-vatel-sky">{t('jusque dans votre assiette.')}</span>
        </h1>
        <p className={cn('max-w-md text-base leading-relaxed text-pretty text-white/80 delay-500 duration-700 md:text-lg', reveal)}>
          {t('Consultez les menus de la semaine, réservez votre repas et suivez votre solde en quelques gestes.')}
        </p>
        <SlideToStart
          label={t('Glisser pour commencer')}
          onComplete={onStart}
          className={cn('mt-3 max-w-sm delay-700 duration-700', reveal, started && 'hidden')}
        />
      </div>
    </section>
  )
}
