import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { PlusIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Spinner } from '#/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { SERVICE_LABELS, formatDayLong, formatXof } from '#/lib/format'
import type { Service } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { DishForm } from './dish-form'

/** Programme un plat (existant ou créé sur place) pour un jour et un service, en brouillon. */
export function AddItemSheet({ date, service }: { date: string; service: Service }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [dishId, setDishId] = useState<string>('')
  const { data: dishes } = useQuery({ ...convexQuery(api.dishes.list, {}), enabled: open })
  const { run, pending, error } = useServerAction(useMutation(api.menus.addItem))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const capacity = Number(new FormData(event.currentTarget).get('capacity'))
    const itemId = await run({ date, service, dishId: dishId as Id<'dishes'>, capacity })
    if (!itemId) return
    setOpen(false)
    setDishId('')
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          aria-label={`Ajouter un plat, ${SERVICE_LABELS[service]}, ${formatDayLong(date)}`}
        >
          <PlusIcon data-icon="inline-start" />
          Ajouter
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Ajouter un plat</SheetTitle>
          <SheetDescription>
            {SERVICE_LABELS[service]}, {formatDayLong(date)}. Ajouté en brouillon.
          </SheetDescription>
        </SheetHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'existing' | 'new')} className="px-4 pb-6">
          <TabsList className="w-full">
            <TabsTrigger value="existing">Plat du catalogue</TabsTrigger>
            <TabsTrigger value="new">Nouveau plat</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="pt-4">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="dish">Plat</FieldLabel>
                  <NativeSelect id="dish" required value={dishId} onChange={(e) => setDishId(e.target.value)}>
                    <NativeSelectOption value="" disabled>
                      {dishes ? 'Choisir un plat' : 'Chargement…'}
                    </NativeSelectOption>
                    {dishes?.map((dish) => (
                      <NativeSelectOption key={dish._id} value={dish._id}>
                        {dish.name} · {formatXof(dish.defaultPriceXof)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="capacity">Portions disponibles</FieldLabel>
                  <Input id="capacity" name="capacity" inputMode="numeric" pattern="[0-9]*" required placeholder="80" />
                </Field>
              </FieldGroup>
              <FormError message={error} />
              <Button type="submit" disabled={pending || !dishId}>
                {pending && <Spinner data-icon="inline-start" />}
                Ajouter au menu
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="new" className="pt-4">
            <DishForm
              onSaved={(id) => {
                setDishId(id)
                setTab('existing')
              }}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
