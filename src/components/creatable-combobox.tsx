import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/utils'

export type Option = { _id: string; name: string }

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

/**
 * Liste cherchable avec création au point d'usage : si le terme n'existe pas, « Créer » appelle
 * le serveur puis sélectionne l'élément renvoyé (existant ou nouveau). La saisie parente est conservée.
 */
export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  label,
  invalid,
}: {
  options: Array<Option>
  value: string | undefined
  onChange: (id: string) => void
  onCreate: (name: string) => Promise<Option>
  placeholder: string
  label: string
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = options.find((option) => option._id === value)
  const exists = options.some((option) => normalize(option.name) === normalize(search))

  async function create() {
    setCreating(true)
    setError(null)
    try {
      const created = await onCreate(search)
      onChange(created._id)
      setSearch('')
      setOpen(false)
    } catch {
      setError('Création impossible. Vérifiez la connexion et réessayez.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground')}
        >
          <span className="truncate">{selected?.name ?? placeholder}</span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option._id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option._id)
                    setOpen(false)
                  }}
                >
                  <CheckIcon className={cn(option._id !== value && 'opacity-0')} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {search.trim() && !exists && (
              <CommandGroup forceMount>
                <CommandItem forceMount value={`__create__${search}`} disabled={creating} onSelect={create}>
                  {creating ? <Spinner /> : <PlusIcon />}
                  Créer « {search.trim()} »
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
          {error && <p className="border-t p-2 text-sm text-destructive">{error}</p>}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
