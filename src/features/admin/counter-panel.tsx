import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { HandPlatterIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Offer } from './overview'
import { FormError } from '#/components/form-error'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '#/components/ui/input-group'
import { SERVICE_LABELS } from '#/lib/format'
import { useServerAction } from '#/lib/server-action'
import { useT } from '#/i18n/i18n'

/**
 * Comptoir, le jour même : retrouver une réservation par nom (sans QR ni téléphone), compter les repas servis
 * sans réservation, et voir le flux par créneau. Chaque geste est confirmé par le serveur, jamais supposé.
 */
export function CounterPanel({ date, offers }: { date: string; offers: Array<Offer> }) {
  const t = useT()
  return (
    <section aria-label={t('Comptoir')} className="grid gap-3 lg:grid-cols-2">
      <NameSearch date={date} />
      <WalkIns offers={offers} />
      <SlotFlow date={date} />
    </section>
  )
}

function NameSearch({ date }: { date: string }) {
  const t = useT()
  const [name, setName] = useState('')
  // Recherche lancée 250 ms après la dernière frappe : un abonnement Convex par nom cherché, pas par touche.
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(name.trim()), 250)
    return () => clearTimeout(timer)
  }, [name])
  const { data: results } = useQuery({ ...convexQuery(api.counter.searchDiner, { date, name: query }), enabled: query.length >= 2 })
  const pickUp = useServerAction(useMutation(api.admin.markPickedUp))
  return (
    <div className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold">{t('Chercher une réservation')}</h2>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label={t('Nom du convive')} placeholder={t('Nom du convive')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </InputGroup>
      <FormError message={pickUp.error} />
      {query.length >= 2 && results?.length === 0 && <p className="text-sm text-muted-foreground">{t('Aucune réservation active à ce nom aujourd’hui.')}</p>}
      <ul className="flex flex-col divide-y">
        {results?.map((r) => (
          <li key={r.bookingId} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.diner}</span>
              <span className="text-xs text-muted-foreground">
                {r.dishName}, {t(SERVICE_LABELS[r.service]).toLowerCase()}
              </span>
            </span>
            {r.status === 'picked_up' ? (
              <Badge variant="secondary">{t('Remis')}</Badge>
            ) : (
              <Button size="sm" disabled={pickUp.pending} onClick={() => void pickUp.run({ bookingId: r.bookingId })}>
                <HandPlatterIcon data-icon="inline-start" />
                {t('Remettre')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function WalkIns({ offers }: { offers: Array<Offer> }) {
  const t = useT()
  const record = useServerAction(useMutation(api.counter.recordWalkIn))
  return (
    <div className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold">{t('Servis sans réservation')}</h2>
      <p className="text-xs text-muted-foreground">{t('Un appui par repas servi : ces chiffres calibrent les prévisions de la cuisine.')}</p>
      <ul className="flex flex-col divide-y">
        {offers.map((offer) => (
          <li key={offer.menuItemId} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0 truncate">
              {offer.dishName} <span className="text-xs text-muted-foreground">{t(SERVICE_LABELS[offer.service])}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-semibold tabular-nums">{offer.walkIns}</span>
              <Button
                size="icon"
                variant="outline"
                aria-label={t('Un repas {dish} servi sans réservation', { dish: offer.dishName })}
                disabled={record.pending}
                onClick={() => void record.run({ menuItemId: offer.menuItemId, idempotencyKey: crypto.randomUUID() })}
              >
                <PlusIcon />
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <FormError message={record.error} />
    </div>
  )
}

/** Flux par créneau : réservés et remis, face à la capacité de distribution. Masqué sans créneaux. */
function SlotFlow({ date }: { date: string }) {
  const t = useT()
  const { data: flow } = useQuery(convexQuery(api.counter.slotFlow, { date }))
  if (!flow || flow.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-3xl border bg-card p-4 shadow-card lg:col-span-2">
      <h2 className="text-sm font-semibold">{t('Flux par créneau')}</h2>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        {flow.map((f) => (
          <li key={`${f.service}-${f.slot}`} className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-2 text-xs tabular-nums">
            <span className="font-semibold">
              {f.slot} <span className="font-normal text-muted-foreground">{t(SERVICE_LABELS[f.service])}</span>
            </span>
            <span className="flex h-1.5 overflow-hidden rounded-full bg-background" aria-hidden>
              <span className="bg-success" style={{ width: `${(f.pickedUp / f.capacity) * 100}%` }} />
              <span className="bg-primary" style={{ width: `${((f.booked - f.pickedUp) / f.capacity) * 100}%` }} />
            </span>
            <span>{t('{picked} remis sur {booked} réservés ({capacity} max)', { picked: f.pickedUp, booked: f.booked, capacity: f.capacity })}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
