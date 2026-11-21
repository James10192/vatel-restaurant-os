import { Link } from '@tanstack/react-router'
import { CoffeeIcon, MoonStarIcon, SunIcon, SunsetIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import { InstallIconButton } from '#/components/install-icon-button'
import { formatDayLong, todayIso } from '#/lib/format'
import { useGreeting } from '#/lib/greeting'
import type { GreetingMoment } from '#/lib/greeting'
import { useLocale, useT } from '#/i18n/i18n'

const MOMENT_ICONS: Record<GreetingMoment, typeof SunIcon> = {
  morning: CoffeeIcon,
  afternoon: SunIcon,
  evening: SunsetIcon,
  night: MoonStarIcon,
}

/** En-tête d'accueil : salutation et icône du moment à gauche, logo Vatel à droite sur mobile. */
export function HomeGreeting({ firstName, canteenName }: { firstName: string; canteenName: string | undefined }) {
  const t = useT()
  const { locale } = useLocale()
  const { moment, salutation, subtitle } = useGreeting(firstName)
  const Icon = MOMENT_ICONS[moment]
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{formatDayLong(todayIso(), locale)}</p>
          <h1 className="text-display">
            {t(salutation)}
            {firstName && ` ${firstName}`}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle ? t(subtitle) : canteenName}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:hidden">
        <InstallIconButton />
        <Link to="/app" aria-label={t('Accueil')} className="shrink-0">
          <BrandLogo className="h-12" />
        </Link>
      </div>
    </header>
  )
}
