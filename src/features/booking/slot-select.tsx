import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { useT } from '#/i18n/i18n'

/**
 * Choix du créneau de retrait, places restantes en direct. Rien n'est affiché si l'établissement n'utilise pas
 * de créneaux ; sans choix, le serveur attribue le premier créneau libre.
 */
export function SlotSelect({ menuItemId, value, onChange, current }: { menuItemId: Id<'menuItems'>; value: string; onChange: (slot: string) => void; current?: string }) {
  const t = useT()
  const { data: slots } = useQuery(convexQuery(api.bookings.slotsFor, { menuItemId }))
  if (!slots || slots.length === 0) return null
  return (
    <Field>
      <FieldLabel htmlFor={`slot-${menuItemId}`}>{t('Créneau de retrait')}</FieldLabel>
      <NativeSelect id={`slot-${menuItemId}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {!current && <NativeSelectOption value="">{t('Premier créneau libre')}</NativeSelectOption>}
        {slots.map(({ slot, remaining }) => (
          <NativeSelectOption key={slot} value={slot} disabled={remaining === 0 && slot !== current}>
            {remaining === 0 ? t('{slot} (complet)', { slot }) : t(remaining > 1 ? '{slot} ({n} places)' : '{slot} ({n} place)', { slot, n: remaining })}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldDescription>{t('Présentez-vous pendant ce créneau pour éviter l’attente.')}</FieldDescription>
    </Field>
  )
}
