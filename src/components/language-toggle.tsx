import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { LOCALES, LOCALE_LABELS, isLocale, useLocale, useT } from '#/i18n/i18n'
import { cn } from '#/lib/utils'

/**
 * Langue de l'interface (FR / EN), même allure que le sélecteur de thème.
 * `onImage` : posé sur la photo bleu Vatel de l'accueil, donc toujours en blanc translucide.
 */
export function LanguageToggle({
  onImage = false,
  className,
}: {
  onImage?: boolean
  className?: string
}) {
  const t = useT()
  const { locale, setLocale } = useLocale()
  return (
    <ToggleGroup
      type="single"
      value={locale}
      onValueChange={(value) => isLocale(value) && setLocale(value)}
      aria-label={t('Langue')}
      spacing={0}
      className={cn(
        'rounded-full border p-0.5 backdrop-blur-md',
        onImage
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-border bg-background/80',
        className,
      )}
    >
      {LOCALES.map((value) => (
        <ToggleGroupItem
          key={value}
          value={value}
          lang={value}
          aria-label={LOCALE_LABELS[value]}
          title={LOCALE_LABELS[value]}
          className={cn(
            'h-9 min-w-9 rounded-full! px-2.5 text-xs font-semibold uppercase',
            onImage
              ? 'text-white/70 hover:bg-white/15 hover:text-white data-[state=on]:bg-white data-[state=on]:text-vatel-navy'
              : 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          )}
        >
          {value}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
