import { CircleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'

/** Erreur de formulaire renvoyée par le serveur ; rien n'est affiché sans message. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
