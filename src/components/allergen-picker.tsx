import { useState } from 'react'
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react'
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '../../convex/lib/allergens'
import type { AllergenCode } from '../../convex/lib/allergens'
import type { AllergyList } from '../../convex/lib/allergies'
import { toKey } from '../../convex/lib/validation'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { useT } from '#/i18n/i18n'

export type AllergyValue = AllergyList

/**
 * Choix d'allergènes en liste déroulante avec recherche : les 14 allergènes majeurs, des suggestions déjà connues de
 * l'établissement, et « Ajouter … » pour tout ce qui manque (mangue, kiwi…). La sélection s'affiche en étiquettes
 * retirables. Le serveur range une saisie libre qui nomme un majeur sous ce majeur.
 */
export function AllergenPicker({
  value,
  onChange,
  suggestions = [],
  addLabel,
  disabled,
}: {
  value: AllergyValue
  onChange: (next: AllergyValue) => void
  suggestions?: Array<string>
  addLabel: string
  disabled?: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const typed = search.trim().replace(/\s+/g, ' ')
  const known = [...ALLERGEN_CODES.map((code) => t(ALLERGEN_LABELS[code])), ...value.others, ...suggestions].map(toKey)
  const canAdd = typed.length >= 2 && typed.length <= 40 && !known.includes(toKey(typed))
  const extra = [...new Set(suggestions)].filter((s) => !value.others.some((o) => toKey(o) === toKey(s)))

  const toggleCode = (code: AllergenCode) =>
    onChange({ ...value, codes: value.codes.includes(code) ? value.codes.filter((c) => c !== code) : [...value.codes, code] })
  const addOther = (text: string) => {
    onChange({ ...value, others: [...value.others, text] })
    setSearch('')
  }
  const removeOther = (text: string) => onChange({ ...value, others: value.others.filter((o) => o !== text) })

  const selected = value.codes.length + value.others.length
  return (
    <div className="flex flex-col gap-3">
      {selected > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('Sélection')}>
          {ALLERGEN_CODES.filter((code) => value.codes.includes(code)).map((code) => (
            <Chip key={code} label={t(ALLERGEN_LABELS[code])} onRemove={() => toggleCode(code)} disabled={disabled} />
          ))}
          {value.others.map((other) => (
            <Chip key={other} label={other} onRemove={() => removeOther(other)} disabled={disabled} />
          ))}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start self-start" disabled={disabled}>
            <PlusIcon data-icon="inline-start" />
            {addLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput value={search} onValueChange={setSearch} placeholder={t('Rechercher ou saisir (ex. mangue)')} />
            <CommandList className="max-h-72">
              <CommandEmpty>{t('Aucun résultat')}</CommandEmpty>
              {canAdd && (
                <CommandGroup>
                  <CommandItem value={`+ ${typed}`} onSelect={() => addOther(typed)}>
                    <PlusIcon />
                    {t('Ajouter « {name} »', { name: typed })}
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading={t('Allergènes majeurs')}>
                {ALLERGEN_CODES.map((code) => (
                  <CommandItem key={code} value={t(ALLERGEN_LABELS[code])} onSelect={() => toggleCode(code)}>
                    <CheckIcon className={value.codes.includes(code) ? 'opacity-100' : 'opacity-0'} />
                    {t(ALLERGEN_LABELS[code])}
                  </CommandItem>
                ))}
              </CommandGroup>
              {extra.length > 0 && (
                <CommandGroup heading={t('Déjà signalés dans l’établissement')}>
                  {extra.map((s) => (
                    <CommandItem key={s} value={s} onSelect={() => addOther(s)}>
                      <PlusIcon />
                      {s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Chip({ label, onRemove, disabled }: { label: string; onRemove: () => void; disabled?: boolean }) {
  const t = useT()
  return (
    <li>
      <Badge variant="secondary" className="h-7 gap-1 pr-1 pl-2.5 text-sm">
        {label}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t('Retirer {name}', { name: label })}
          className="grid size-5 place-items-center rounded-full hover:bg-foreground/10"
        >
          <XIcon className="size-3" />
        </button>
      </Badge>
    </li>
  )
}
