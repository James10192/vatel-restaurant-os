import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from 'lucide-react'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '#/components/ui/dropdown-menu'
import { THEMES, THEME_LABELS, useTheme } from '#/lib/theme'

const ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const

/** Apparence dans le menu Profil (#11) : réglage rangé, la navigation principale reste dégagée. */
export function ThemeSubmenu() {
  const { preference, choose } = useTheme()
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <PaletteIcon />
        Apparence : {THEME_LABELS[preference]}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={preference} onValueChange={choose}>
          {THEMES.map((theme) => {
            const Icon = ICONS[theme]
            return (
              <DropdownMenuRadioItem key={theme} value={theme}>
                <Icon />
                {THEME_LABELS[theme]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
