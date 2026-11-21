import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { CameraOffIcon, CircleCheckIcon, CircleXIcon, HandPlatterIcon, ScanLineIcon, UserCheckIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { PASS_REFUSALS, formatCode, normalizeCode } from '../../../convex/lib/pass'
import { useQrCamera } from './use-qr-camera'
import { FormError } from '#/components/form-error'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { SERVICE_LABELS, formatDayLong } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useLocale, useT } from '#/i18n/i18n'

/**
 * Comptoir : scanner le QR (ou saisir le code), lire le nom et le repas, vérifier la personne, remettre.
 * Rien n'est remis au scan : la remise exige un geste du personnel, revérifié par le serveur.
 */
export function PassScanner() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [served, setServed] = useState<string | null>(null)
  const { videoRef, state } = useQrCamera(open && code === null && served === null, (text) => setCode(text.slice(0, 64)))
  const redeem = useServerAction(useMutation(api.passes.redeem))
  const reset = () => {
    setCode(null)
    setTyped('')
    setServed(null)
    redeem.setError(null)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        reset()
      }}
    >
      <SheetTrigger asChild>
        <Button>
          <ScanLineIcon data-icon="inline-start" />
          {t('Scanner un QR')}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-lg overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t('Remise par QR')}</SheetTitle>
          <SheetDescription>{t('Le QR seul ne prouve pas l’identité : vérifiez le nom avant de remettre.')}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {served ? (
            <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
              <CircleCheckIcon className="size-14 text-success" />
              <p className="text-lg font-semibold">{t('Remis : {dish}', { dish: served })}</p>
              <Button onClick={reset}>{t('Scanner le suivant')}</Button>
            </div>
          ) : code === null ? (
            <>
              {state === 'denied' || state === 'unavailable' ? (
                <Alert>
                  <CameraOffIcon />
                  <AlertDescription>
                    {state === 'denied' ? t('Caméra refusée : saisissez le code ci-dessous.') : t('Caméra indisponible : saisissez le code ci-dessous.')}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
                  <video ref={videoRef} muted playsInline className="size-full object-cover" />
                  {state === 'scanning' && <div aria-hidden className="absolute inset-[18%] rounded-2xl border-2 border-white/80" />}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (typed.trim()) setCode(typed.trim())
                }}
              >
                <Field className="flex-1">
                  <FieldLabel htmlFor="pass-code">{t('Ou saisir le code')}</FieldLabel>
                  <Input
                    id="pass-code"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="ABCD-EFGH-JKMN"
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={20}
                    autoFocus={state === 'denied' || state === 'unavailable'}
                  />
                  <FieldDescription>{t('12 caractères affichés sous le QR de l’usager.')}</FieldDescription>
                </Field>
                <Button type="submit" variant="outline" className="mb-6">
                  {t('Vérifier')}
                </Button>
              </form>
            </>
          ) : (
            <PassPreview
              code={code}
              pending={redeem.pending}
              error={redeem.error}
              onCancel={reset}
              onRedeem={async () => {
                const done = await redeem.run({ code })
                if (done) setServed(done.dishName)
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PassPreview({
  code,
  pending,
  error,
  onCancel,
  onRedeem,
}: {
  code: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onRedeem: () => void
}) {
  const t = useT()
  const { locale } = useLocale()
  const { data, isPending } = useQuery(convexQuery(api.passes.inspect, { code }))
  if (isPending || !data) return <Skeleton className="h-48 rounded-2xl" />
  const { verdict, meal } = data
  const normalized = normalizeCode(code)
  return (
    <div className="flex flex-col gap-4">
      {normalized && <p className="text-center text-sm text-muted-foreground tabular-nums">{formatCode(normalized)}</p>}
      {meal && (
        <div className="flex flex-col items-center gap-1 rounded-2xl border p-5 text-center">
          <UserCheckIcon className="size-7 text-primary" />
          <p className="text-2xl font-bold">{meal.diner}</p>
          <p className="font-medium">{meal.dishName}</p>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatDayLong(meal.date, locale)}, {t(SERVICE_LABELS[meal.service]).toLowerCase()}
            {meal.slot && <>, {t('retrait à {slot}', { slot: meal.slot })}</>}
          </p>
        </div>
      )}
      {verdict === 'ready' ? (
        <p className="text-center text-sm">{t('Vérifiez l’identité de la personne, puis remettez le repas.')}</p>
      ) : (
        <Alert variant="destructive">
          <CircleXIcon />
          <AlertTitle>{t('Remise refusée')}</AlertTitle>
          <AlertDescription>{t(PASS_REFUSALS[verdict])}</AlertDescription>
        </Alert>
      )}
      <FormError message={error} />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          {verdict === 'ready' ? t('Annuler') : t('Scanner un autre QR')}
        </Button>
        {verdict === 'ready' && (
          <Button className="flex-1" disabled={pending} onClick={onRedeem}>
            {pending ? <Spinner data-icon="inline-start" /> : <HandPlatterIcon data-icon="inline-start" />}
            {t('Remettre le repas')}
          </Button>
        )}
      </div>
    </div>
  )
}
