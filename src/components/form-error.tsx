import { CircleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { useT } from '#/i18n/i18n'

/** Erreur de formulaire (serveur ou client), traduite si connue ; rien n'est affiché sans message. */
export function FormError({ message }: { message: string | null }) {
  const t = useT()
  if (!message) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{t(message)}</AlertDescription>
    </Alert>
  )
}
