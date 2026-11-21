import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatXof } from '#/lib/format'
import { useT } from '#/i18n/i18n'
import { percent } from './overview'
import type { Summary } from './overview'

type Totals = Summary['totals']

/**
 * Carte maîtresse du service : une seule lecture (taux de réservation), le chiffre clé, ce qui reste,
 * puis l'action suivante. Le détail par statut est dans les tuiles juste en dessous (`StatTiles`).
 * Surface de marque : bleu Vatel foncé dans les deux thèmes.
 */
export function ServiceHero({ date, dayLabel, totals }: { date: string; dayLabel: string; totals: Totals }) {
  const t = useT()
  const booked = totals.confirmed + totals.pickedUp
  const rate = percent(booked, totals.capacity)
  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-vatel-navy text-white shadow-xl shadow-vatel-navy/25 ring-1 ring-white/10">
      {/* Halo et lumière rasante : profondeur sans motif qui se coupe sur petit écran. */}
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 -z-10 size-72 rounded-full bg-vatel-sky/25 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_100%,rgb(255_255_255/0.07),transparent_55%)]"
      />

      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <header className="flex items-center justify-between gap-3">
          <p className="text-eyebrow text-white/70">
            {t('Service')} {dayLabel}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] font-medium text-white/85 ring-1 ring-white/15">
            <span aria-hidden className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-vatel-sky opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-vatel-sky" />
            </span>
            {t('En direct')}
          </span>
        </header>

        <div className="flex items-center gap-5 sm:gap-7">
          <RateRing value={rate} label={t('{rate} % des portions réservées', { rate })} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-4xl leading-none font-bold tracking-[-0.03em] tabular-nums sm:text-5xl">
              {booked}
              <span className="text-2xl font-semibold text-white/45 sm:text-3xl"> / {totals.capacity}</span>
            </p>
            <p className="text-sm text-white/80">{t('portions réservées')}</p>
            <p className="text-xs text-white/60 tabular-nums">
              {t(totals.remaining > 1 ? '{n} encore libres' : '{n} encore libre', { n: totals.remaining })}
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/65 tabular-nums">
            {t('{amount} engagés, crédits de démonstration', { amount: formatXof(totals.demoAmountXof) })}
          </p>
          {/* Blanc sur la surface de marque dans les deux thèmes (la variante « secondary » s'assombrit en thème sombre). */}
          <Button size="lg" className="w-full rounded-full bg-white text-vatel-navy hover:bg-white/90 sm:w-auto" asChild>
            <Link to="/admin/services" search={{ date, status: totals.confirmed > 0 ? 'confirmed' : undefined }}>
              {totals.confirmed > 0 ? t('Servir {n} repas', { n: totals.confirmed }) : t('Voir les commandes')}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </footer>
      </div>
    </section>
  )
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Anneau de progression (SVG, aucun calcul côté client hors affichage) ; animé seulement sans « réduire les animations ». */
function RateRing({ value, label }: { value: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="relative size-24 shrink-0 sm:size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="9" className="stroke-white/15" />
        {value > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            className="stroke-vatel-sky motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(value, 100) / 100)}
          />
        )}
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
          {value}
          <span className="text-sm font-semibold text-white/70 sm:text-base">%</span>
        </span>
      </span>
    </div>
  )
}
