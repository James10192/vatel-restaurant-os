import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { THEMES, THEME_LABELS, useTheme } from '#/lib/theme'
import { cn } from '#/lib/utils'

export const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const

/**
 * Apparence accessible avant connexion (même préférence que le menu Profil).
 * `onImage` : posé sur la photo bleu Vatel, donc toujours en blanc translucide.
 */
export function ThemeToggle({ onImage = false, className }: { onImage?: boolean; className?: string }) {
  const { preference, choose } = useTheme()
  return (
    <ToggleGroup
      type="single"
      value={preference}
      onValueChange={choose}
      aria-label="Apparence"
      spacing={0}
      className={cn(
        'rounded-full border p-0.5 backdrop-blur-md',
        onImage ? 'border-white/20 bg-white/10 text-white' : 'border-border bg-background/80',
        className,
      )}
    >
      {THEMES.map((theme) => {
        const Icon = THEME_ICONS[theme]
        return (
          <ToggleGroupItem
            key={theme}
            value={theme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
            className={cn(
              'size-9 min-w-9 rounded-full! p-0',
              onImage
                ? 'text-white/70 hover:bg-white/15 hover:text-white data-[state=on]:bg-white data-[state=on]:text-vatel-navy'
                : 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
            )}
          >
            <Icon />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
