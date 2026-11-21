import { useSyncExternalStore } from 'react'

/**
 * Installation de la PWA. `beforeinstallprompt` (Chrome, Edge, Android) ne se déclenche qu'une fois par
 * chargement : ce module l'écoute dès son import (depuis `__root`), avant toute navigation.
 * iOS n'a aucune API d'installation : on y affiche seulement la marche à suivre du menu Partager.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
  interface Navigator {
    /** Safari iOS : vrai quand la page est ouverte depuis l'écran d'accueil. */
    standalone?: boolean
  }
}

/** `available` : le navigateur propose l'installation ; `ios` : à faire via Partager ; `unavailable` : rien à proposer. */
export type InstallState = 'installed' | 'available' | 'ios' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
let justInstalled = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // pas de mini-bannière automatique : l'utilisateur choisit depuis le Profil
    deferred = event
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    emit()
  })
}

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true

/** iPhone, iPod et iPad (iPadOS se présente comme un Mac tactile). */
export const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

function getSnapshot(): InstallState {
  if (justInstalled || isStandalone()) return 'installed'
  if (deferred) return 'available'
  return isIos() ? 'ios' : 'unavailable'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie le choix réel de l'utilisateur. */
async function promptInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  const event = deferred
  if (!event) return 'unavailable'
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null // un événement ne peut servir qu'une fois
  emit()
  return outcome
}

export function useInstall() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => 'unavailable' as const,
  )
  return { state, promptInstall }
}
