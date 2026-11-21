import { useState } from 'react'
import { useMutation } from 'convex/react'
import { FlaskConicalIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { FormError } from '#/components/form-error'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Spinner } from '#/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatXof } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

/** Montants proposés à l'écran ; le plafond réel est appliqué par le serveur (politique de l'établissement). */
const AMOUNTS = [1000, 2500, 5000, 10000]

/** Recharge FICTIVE pour la démonstration : aucun paiement réel n'est effectué. */
export function DemoTopUp() {
  const t = useT()
  const [amount, setAmount] = useState(String(AMOUNTS[1]))
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const [done, setDone] = useState<number | null>(null)
  const { run, pending, error } = useServerAction(useMutation(api.wallet.topUpDemo))

  return (
    <Card className="@container rounded-3xl">
      <CardHeader>
        <CardTitle>{t('Recharger')}</CardTitle>
        <CardDescription>{t('Choisissez un montant.')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <FlaskConicalIcon />
          <AlertTitle>{t('Mode démonstration')}</AlertTitle>
          <AlertDescription>{t('Crédits fictifs, non convertibles. Aucun paiement Mobile Money réel.')}</AlertDescription>
        </Alert>
        <ToggleGroup
          type="single"
          variant="outline"
          value={amount}
          onValueChange={(value) => value && setAmount(value)}
          aria-label={t('Montant de la recharge')}
          className="grid w-full grid-cols-2 gap-2 @md:grid-cols-4"
        >
          {AMOUNTS.map((value) => (
            <ToggleGroupItem key={value} value={String(value)}>
              {formatXof(value)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FormError message={error} />
        {done !== null && !error && (
          <p className="text-sm text-primary" role="status">
            {t('Recharge confirmée par le serveur. Nouveau solde :')} {formatXof(done)}.
          </p>
        )}
        <Button
          disabled={pending}
          onClick={async () => {
            setDone(null)
            const result = await run({ amountXof: Number(amount), idempotencyKey: requestKey })
            if (!result) return
            setDone(result.balanceXof)
            setRequestKey(crypto.randomUUID())
          }}
        >
          {pending && <Spinner data-icon="inline-start" />}
          {t('Recharger')} {formatXof(Number(amount))} {t('(démo)')}
        </Button>
      </CardContent>
    </Card>
  )
}
