import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'

/**
 * Le « passe » : deux pistes à la même échelle. En haut la demande (remis, à servir, hypothèses),
 * en bas le préparé. L'écart hachuré entre les deux, c'est ce qu'il reste à envoyer ; le trait vertical, la capacité.
 * Une seule lecture, sans chiffre à additionner.
 */
export function ProductionRail({
  pickedUp,
  confirmed,
  assumed = 0,
  prepared,
  capacity,
}: {
  pickedUp: number
  confirmed: number
  assumed?: number
  prepared: number | null
  capacity: number
}) {
  const t = useT()
  const demand = pickedUp + confirmed + assumed
  const scale = Math.max(demand, prepared ?? 0, capacity, 1)
  const pct = (n: number) => `${(n / scale) * 100}%`
  const missing = prepared === null ? 0 : Math.max(0, demand - prepared)
  const label = t('Demande {demand}, préparé {prepared}, capacité {capacity}', {
    demand,
    prepared: prepared ?? t('inconnu'),
    capacity,
  })
  return (
    <div role="img" aria-label={label} className="relative flex flex-col gap-1.5 py-1">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <span className="bg-success" style={{ width: pct(pickedUp) }} />
        <span className="bg-primary" style={{ width: pct(confirmed) }} />
        {assumed > 0 && <span className="bg-primary/35" style={{ width: pct(assumed) }} />}
      </div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-muted">
        {prepared === null ? (
          <span className="w-full bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_8px)]" />
        ) : (
          <>
            <span className="bg-[var(--vatel-bleu-2)]" style={{ width: pct(Math.min(prepared, scale)) }} />
            {missing > 0 && (
              <span
                className="bg-[repeating-linear-gradient(135deg,var(--vatel-corail)_0_3px,transparent_3px_7px)] opacity-80"
                style={{ width: pct(missing) }}
              />
            )}
          </>
        )}
      </div>
      <span
        aria-hidden
        className={cn('absolute inset-y-0 w-0.5 rounded-full bg-foreground/70', capacity >= scale && 'hidden')}
        style={{ left: pct(capacity) }}
      />
    </div>
  )
}
