import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { ArrowRightIcon, ChevronsRightIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

const THRESHOLD = 0.75

/**
 * Glisser pour commencer. Le curseur se tire vers la droite ; au-delà de 75 % de la course,
 * l'action est déclenchée. Clic ou Entrée sur le curseur déclenchent aussi (clavier, lecteurs d'écran).
 */
export function SlideToStart({ label, onComplete, className }: { label: string; onComplete: () => void; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startX: number; max: number; moved: boolean } | null>(null)
  const [offset, setOffset] = useState(0)
  const [max, setMax] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(false)

  function complete(end: number) {
    setOffset(end)
    setDone(true)
    window.setTimeout(onComplete, 250)
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    const track = trackRef.current
    if (!track || done) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, max: track.clientWidth - event.currentTarget.offsetWidth - 8, moved: false }
    setMax(drag.current.max)
    setDragging(true)
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return
    const delta = event.clientX - drag.current.startX
    if (Math.abs(delta) > 4) drag.current.moved = true
    setOffset(Math.min(Math.max(delta, 0), drag.current.max))
  }

  function onPointerUp() {
    const state = drag.current
    drag.current = null
    setDragging(false)
    if (!state) return
    if (!state.moved || offset >= state.max * THRESHOLD) complete(state.max)
    else setOffset(0)
  }

  const progress = done ? 1 : offset / Math.max(max, 1)

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative flex h-16 w-full items-center overflow-hidden rounded-full border border-primary-foreground/20 bg-primary-foreground/10 p-1 backdrop-blur-md',
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-full bg-primary-foreground/15"
        style={{ width: offset + 64, transition: dragging ? 'none' : 'width 300ms ease-out' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 pl-14 text-sm font-semibold tracking-wide"
        style={{ opacity: 1 - progress }}
      >
        {label}
        <ChevronsRightIcon className="motion-safe:animate-pulse" />
      </span>
      <button
        type="button"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            complete(trackRef.current ? trackRef.current.clientWidth - 64 : 0)
          }
        }}
        className="relative z-10 flex size-14 shrink-0 touch-none items-center justify-center rounded-full bg-background text-primary shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
        style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 300ms ease-out' }}
      >
        <ArrowRightIcon />
      </button>
    </div>
  )
}
