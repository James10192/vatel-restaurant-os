import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { UserIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Spinner } from '#/components/ui/spinner'
import { useServerAction } from '#/lib/server-action'

const MAX_LENGTH = 80

/**
 * Modification du nom (compte et nom vu par le personnel, en une seule transaction serveur).
 * Le formulaire ne se ferme qu'après confirmation ; le nouveau nom s'affiche par la requête temps réel.
 */
export function RenameForm({
  current,
  onDone,
}: {
  current: string
  onDone: () => void
}) {
  const rename = useServerAction(useMutation(api.account.rename))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (name === current) return onDone()
    if ((await rename.run({ name })) !== undefined) onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="name">Nom affiché</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <UserIcon />
          </InputGroupAddon>
          <InputGroupInput
            id="name"
            name="name"
            defaultValue={current}
            autoComplete="name"
            maxLength={MAX_LENGTH}
            required
            autoFocus
          />
        </InputGroup>
        <FieldDescription>
          Visible par le personnel au moment du service.
        </FieldDescription>
      </Field>
      <FormError message={rename.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={rename.pending}>
          {rename.pending && <Spinner data-icon="inline-start" />}
          Enregistrer
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={rename.pending}
          onClick={onDone}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
