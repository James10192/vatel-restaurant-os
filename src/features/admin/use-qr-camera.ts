import { useEffect, useRef, useState } from 'react'

/** BarcodeDetector natif (Chrome, Android) : absent des types DOM de TypeScript, décrit ici au strict nécessaire. */
type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }
type DetectorConstructor = new (options: { formats: Array<string> }) => Detector

export type CameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable'

const SCAN_EVERY_MS = 250

/**
 * Lecture de QR à la caméra arrière. Détecteur natif s'il existe, sinon jsQR chargé à la demande (aucun coût
 * pour les autres écrans). Appelle `onCode` une fois par lecture puis s'arrête ; caméra coupée au démontage.
 */
export function useQrCamera(active: boolean, onCode: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('idle')
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    if (!active) return
    // Objet (et non booléen) : l'arrêt vient d'une autre fermeture, TypeScript ne doit pas le figer à false.
    const session = { stopped: false }
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      session.stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }

    async function start() {
      // Absent hors contexte sécurisé (HTTP) ou sur un appareil sans caméra.
      if (!('mediaDevices' in navigator)) return setState('unavailable')
      setState('starting')
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        return setState(session.stopped ? 'idle' : 'denied')
      }
      const video = videoRef.current
      if (session.stopped || !video) return stop()
      video.srcObject = stream
      await video.play().catch(() => undefined)
      setState('scanning')
      const read = await makeReader()
      const tick = async () => {
        const text = video.readyState >= 2 ? await read(video).catch(() => null) : null
        if (isStopped(session)) return
        if (text) {
          stop()
          setState('idle')
          onCodeRef.current(text)
        } else timer = setTimeout(() => void tick(), SCAN_EVERY_MS)
      }
      void tick()
    }

    void start()
    return stop
  }, [active])

  return { videoRef, state }
}

/** Lecture hors du flux de contrôle : l'arrêt peut survenir pendant un `await`. */
const isStopped = (session: { stopped: boolean }) => session.stopped

async function makeReader(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
  const Native = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector
  if (Native) {
    const detector = new Native({ formats: ['qr_code'] })
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
  }
  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  return (video) => {
    if (!context) return Promise.resolve(null)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    return Promise.resolve(jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null)
  }
}
