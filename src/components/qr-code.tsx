import { useMemo } from 'react'
import { encode } from 'uqr'

/**
 * QR en SVG React (aucun HTML injecté) : un seul chemin pour tous les modules noirs, marge blanche de 4 modules
 * pour la lecture. Toujours noir sur blanc, même en thème sombre : les lecteurs l'exigent.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 4 })
    const d = qr.data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('')
    return { path: d, size: qr.size }
  }, [value])
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className={className}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
