import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, MoonIcon, SunIcon } from 'lucide-react'
import { DishVisual } from '#/components/dish-visual'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { CapacityBar, TONES, percent } from './overview'
import type { Offer } from './overview'

const SERVICE_ICONS = { lunch: SunIcon, dinner: MoonIcon } as const

/** Chiffre de statut aligné à droite, coloré seulement s'il n'est pas nul (le zéro reste discret). */
function Count({ value, tone }: { value: number; tone: 'confirmed' | 'picked_up' | 'cancelled' }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-sm tabular-nums',
        value > 0 ? cn('font-semibold', TONES[tone].chip) : 'text-muted-foreground',
      )}
    >
      {value}
    </span>
  )
}

/** Bureau : détail par plat en tableau dense (chiffres alignés, jauge de capacité, accès aux commandes du plat). */
export function OffersTable({ date, offers }: { date: string; offers: Array<Offer> }) {
  const t = useT()
  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5 text-eyebrow text-muted-foreground">{t('Plat')}</TableHead>
            <TableHead className="text-eyebrow text-muted-foreground">{t('Service')}</TableHead>
            <TableHead className="text-right text-eyebrow text-muted-foreground">{t('Prix')}</TableHead>
            <TableHead className="text-center text-eyebrow text-muted-foreground">{t('À servir')}</TableHead>
            <TableHead className="text-center text-eyebrow text-muted-foreground">{t('Remis')}</TableHead>
            <TableHead className="text-center text-eyebrow text-muted-foreground">{t('Annulés')}</TableHead>
            <TableHead className="w-[30%] text-eyebrow text-muted-foreground">{t('Capacité')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const Icon = SERVICE_ICONS[offer.service]
            const booked = offer.confirmed + offer.pickedUp
            return (
              <TableRow key={offer.menuItemId} className="group">
                <TableCell className="py-3 pl-5">
                  <Link
                    to="/admin/services"
                    search={{ date, item: offer.menuItemId }}
                    className="flex items-center gap-3 rounded-xl font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <DishVisual name={offer.dishName} className="size-10 shrink-0 rounded-xl text-xs" />
                    <span className="truncate group-hover:underline">{offer.dishName}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                    <Icon aria-hidden className="size-3.5" />
                    {t(SERVICE_LABELS[offer.service])}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatXof(offer.priceXof)}</TableCell>
                <TableCell className="text-center">
                  <Count value={offer.confirmed} tone="confirmed" />
                </TableCell>
                <TableCell className="text-center">
                  <Count value={offer.pickedUp} tone="picked_up" />
                </TableCell>
                <TableCell className="text-center">
                  <Count value={offer.cancelled} tone="cancelled" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-xs tabular-nums">
                      <span>
                        <span className="font-semibold">{booked}</span>
                        <span className="text-muted-foreground"> / {offer.capacity}</span>
                      </span>
                      <span className="text-muted-foreground">{percent(booked, offer.capacity)} %</span>
                    </div>
                    <CapacityBar offer={offer} />
                  </div>
                </TableCell>
                <TableCell className="pr-4">
                  <ChevronRightIcon
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
