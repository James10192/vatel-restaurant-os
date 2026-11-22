import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { currentUserQuery } from '#/lib/session'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { PROFILE_NAV, TAB_BAR_PAGES, navFor, normalizePath } from './nav-model'
import type { NavItem } from './nav-model'

/** Au-delà de ce déplacement (px), un appui devient un glissement : on suit le doigt au lieu d'ouvrir l'onglet. */
const DRAG_THRESHOLD = 10

/**
 * Barre du bas (mobile) en verre, façon capsule flottante : contenu visible dessous, indicateur de l'onglet actif
 * qui glisse d'un onglet à l'autre. On peut aussi faire glisser le doigt le long de la barre : l'indicateur suit
 * 1:1, et le relâcher ouvre l'onglet le plus proche. Le CSS gère « réduire les animations / la transparence ».
 */
export function GlassTabBar() {
  const t = useT()
  const { data: user } = useSuspenseQuery(currentUserQuery)
  const tabs: Array<NavItem> = [...navFor(user?.membership?.role).slice(0, TAB_BAR_PAGES), PROFILE_NAV]
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = activeIndex(tabs, pathname)
  const barRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startX: number; moved: boolean } | null>(null)
  // Un glissement terminé a déjà navigué : le clic qui suit le relâchement ne doit pas ouvrir un autre onglet.
  const swallowClick = useRef(false)
  const [dragX, setDragX] = useState<number | null>(null)

  /** Position sous le doigt, en onglets (0 = premier, décimal pendant un glissement). */
  const positionAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return Math.max(active, 0)
    return Math.min(tabs.length - 1, Math.max(0, ((clientX - rect.left) / rect.width) * tabs.length - 0.5))
  }
  // L'indicateur suit le doigt pendant un glissement, sinon l'onglet actif (aucun hors des onglets).
  const position = dragX ?? (active < 0 ? null : active)

  return (
    <nav aria-label={t('Navigation principale')} className="glass-tab-bar fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 md:hidden">
      <div
        ref={barRef}
        className="relative flex touch-pan-y rounded-full p-1"
        onPointerDown={(e) => {
          swallowClick.current = false
          drag.current = { startX: e.clientX, moved: false }
        }}
        onPointerMove={(e) => {
          const state = drag.current
          if (!state) return
          if (!state.moved && Math.abs(e.clientX - state.startX) < DRAG_THRESHOLD) return
          if (!state.moved) {
            state.moved = true
            barRef.current?.setPointerCapture(e.pointerId)
          }
          setDragX(positionAt(e.clientX))
        }}
        onPointerUp={(e) => {
          const state = drag.current
          drag.current = null
          if (!state?.moved) return
          swallowClick.current = true
          setDragX(null)
          void navigate({ to: tabs[Math.round(positionAt(e.clientX))].to })
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragX(null)
        }}
      >
        {position !== null && (
          // Piste intérieure (sans le rembourrage) : l'indicateur s'y déplace en largeurs d'onglet.
          <span aria-hidden className="pointer-events-none absolute inset-1">
            <span
              data-dragging={dragX !== null || undefined}
              className="glass-tab-indicator block h-full rounded-full"
              style={{ width: `${100 / tabs.length}%`, transform: `translateX(${position * 100}%)` }}
            />
          </span>
        )}
        {tabs.map(({ to, short, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            // Le lien natif ne doit ni se « traîner » (sinon le navigateur annule le geste), ni s'ouvrir après un glissement.
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => swallowClick.current && e.preventDefault()}
            aria-current={i === active ? 'page' : undefined}
            className={cn(
              'press relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[0.6875rem] font-medium tracking-[0.01em] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50',
              i === active ? 'text-primary' : 'text-foreground/70',
            )}
          >
            <Icon aria-hidden className="size-[1.375rem]" strokeWidth={i === active ? 2.25 : 1.75} />
            {t(short)}
          </Link>
        ))}
      </div>
    </nav>
  )
}

/**
 * Onglet actif : correspondance exacte du chemin, sinon le plus long préfixe (sous-pages), sinon aucun.
 * Le premier onglet est l'accueil du rôle (`/app`, `/admin`) : préfixe de tout, il ne compte qu'en exact.
 */
function activeIndex(tabs: Array<NavItem>, pathname: string) {
  const path = normalizePath(pathname)
  const exact = tabs.findIndex((tab) => tab.to === path)
  if (exact >= 0) return exact
  let best = -1
  tabs.forEach((tab, i) => {
    if (i > 0 && path.startsWith(`${tab.to}/`) && (best < 0 || tab.to.length > tabs[best].to.length)) best = i
  })
  return best
}
