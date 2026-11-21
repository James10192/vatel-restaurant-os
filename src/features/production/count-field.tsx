import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useT } from '#/i18n/i18n'

/** Champ « nombre de portions » : clavier numérique sur mobile, erreur affichée sous le champ. */
export function CountField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  min = 0,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  min?: number
}) {
  const t = useT()
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        className="tabular-nums"
      />
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldError>{t(error)}</FieldError>}
    </Field>
  )
}

/** « 12 » -> 12 ; vide, décimal ou texte -> NaN (refusé par la validation, jamais arrondi en silence). */
export const parseCount = (value: string) => (/^-?\d+$/.test(value.trim()) ? Number(value) : Number.NaN)
