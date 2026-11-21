import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Spinner } from '#/components/ui/spinner'
import { formatXof } from '#/lib/format'
import { AllergenBadges } from './allergen-badges'
import { useServerAction } from '#/lib/server-action'

type AdminItem = Doc<'menuItems'> & { dishName: string; allergens: Doc<'dishes'>['allergens'] }

export function MenuItemRow({ item }: { item: AdminItem }) {
  const { run, pending, error } = useServerAction(useMutation(api.menus.updateItem))
  const removeItem = useMutation(api.menus.removeItem)
  const [open, setOpen] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await run({ itemId: item._id, priceXof: Number(data.get('price')), capacity: Number(data.get('capacity')) })
    if (result === null) setOpen(false)
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.dishName}</span>
          <Badge variant={item.status === 'published' ? 'default' : 'outline'}>
            {item.status === 'published' ? 'Publié' : 'Brouillon'}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatXof(item.priceXof)} · {item.capacity} portions
        </span>
        <AllergenBadges allergens={item.allergens} />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Modifier ${item.dishName}`}>
            <PencilIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`price-${item._id}`}>Prix (FCFA)</FieldLabel>
                <Input id={`price-${item._id}`} name="price" inputMode="numeric" defaultValue={item.priceXof} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`capacity-${item._id}`}>Portions disponibles</FieldLabel>
                <Input id={`capacity-${item._id}`} name="capacity" inputMode="numeric" defaultValue={item.capacity} required />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                Enregistrer
              </Button>
            </FieldGroup>
          </form>
        </PopoverContent>
      </Popover>
      {item.status === 'draft' && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Retirer ${item.dishName}`}
          onClick={() => removeItem({ itemId: item._id })}
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  )
}
