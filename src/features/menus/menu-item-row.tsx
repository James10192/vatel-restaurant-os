import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { DishVisual } from '#/components/dish-visual'
import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Spinner } from '#/components/ui/spinner'
import { formatXof } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { AllergenBadges } from './allergen-badges'
import { StatusPill } from './status-pill'
import { useT } from '#/i18n/i18n'

type AdminItem = Doc<'menuItems'> & {
  dishName: string
  allergens: Doc<'dishes'>['allergens']
}

/**
 * Fiche d'un plat programmé : visuel, statut, allergènes, prix figé et portions ; édition sur place.
 * Container query : s'adapte à sa cellule (colonne large en liste, cellule étroite du planning hebdomadaire).
 */
export function MenuItemRow({ item }: { item: AdminItem }) {
  const t = useT()
  return (
    <li className="@container rounded-2xl border bg-card shadow-card">
      <div className="flex gap-3 p-2.5 pr-1.5 @max-[15rem]:gap-1.5 @max-[15rem]:p-2 @max-[15rem]:pr-1">
        <DishVisual name={item.dishName} className="size-14 shrink-0 rounded-xl text-sm @max-[15rem]:hidden" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <div className="flex items-start justify-between gap-2 @max-[15rem]:flex-col @max-[15rem]:gap-0.5">
            <span className="leading-snug font-semibold break-words @max-[15rem]:text-sm">{item.dishName}</span>
            <span className="font-bold whitespace-nowrap text-primary tabular-nums @max-[15rem]:text-sm">{formatXof(item.priceXof)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <StatusPill status={item.status} />
            <span className="tabular-nums">{t('{n} portions', { n: item.capacity })}</span>
          </div>
          <div className="min-w-0 [&_[data-slot=badge]]:h-auto [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:whitespace-normal">
            <AllergenBadges allergens={item.allergens} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5">
          <EditItemPopover item={item} />
          {item.status === 'draft' && <RemoveItemButton item={item} />}
        </div>
      </div>
    </li>
  )
}

function EditItemPopover({ item }: { item: AdminItem }) {
  const t = useT()
  const { run, pending, error } = useServerAction(useMutation(api.menus.updateItem))
  const [open, setOpen] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await run({
      itemId: item._id,
      priceXof: Number(data.get('price')),
      capacity: Number(data.get('capacity')),
    })
    if (result === null) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${item.dishName}`}>
          <PencilIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`price-${item._id}`}>{t('Prix (FCFA)')}</FieldLabel>
              <Input id={`price-${item._id}`} name="price" inputMode="numeric" defaultValue={item.priceXof} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`capacity-${item._id}`}>{t('Portions disponibles')}</FieldLabel>
              <Input id={`capacity-${item._id}`} name="capacity" inputMode="numeric" defaultValue={item.capacity} required />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {t('Enregistrer')}
            </Button>
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  )
}

/** Retrait d'un brouillon ; l'erreur serveur éventuelle reste visible au survol (jamais de succès supposé). */
function RemoveItemButton({ item }: { item: AdminItem }) {
  const t = useT()
  const { run, pending, error } = useServerAction(useMutation(api.menus.removeItem))
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label={error ? t('Échec du retrait : {error}', { error: t(error) }) : t('Retirer {dish}', { dish: item.dishName })}
      title={error ?? undefined}
      disabled={pending}
      onClick={() => run({ itemId: item._id })}
    >
      {pending ? <Spinner /> : <Trash2Icon />}
    </Button>
  )
}
