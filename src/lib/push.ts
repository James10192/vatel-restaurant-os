import { useCallback, useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { isIos, isStandalone } from '#/lib/install'

/**
 * Notifications push de cet appareil. Le service worker (`public/sw.js`) n'est enregistré qu'à l'activation
 * et ne fait qu'afficher les notifications : aucun cache. « Activées » n'est affiché qu'après confirmation serveur.
 */
export type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'needs-install'
  | 'not-configured'
  | 'denied'
  | 'off'
  | 'on'

const SW_URL = '/sw.js'

const isSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

function keysOf(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth)
    throw new Error('Abonnement incomplet.')
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth }
}

/**
 * Oublie cet appareil (déconnexion, appareil partagé) : retrait côté serveur puis côté navigateur.
 * Ne bloque jamais la déconnexion : chaque étape est bornée et ses erreurs ignorées.
 */
export async function forgetThisDevice(
  removeOnServer: (endpoint: string) => Promise<unknown>,
) {
  if (typeof navigator === 'undefined' || !isSupported()) return
  const subscription = await currentSubscription().catch(() => null)
  if (!subscription) return
  await settleWithin(removeOnServer(subscription.endpoint))
  await settleWithin(subscription.unsubscribe())
}

/** Attend une étape au plus 2,5 s, sans jamais propager son erreur (réseau lent ou coupé). */
const settleWithin = (step: Promise<unknown>) =>
  Promise.race([
    step.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ])

/** À utiliser pour un membre rattaché seulement (le serveur refuse les autres). */
export function usePushNotifications() {
  const { data: publicKey, isPending } = useQuery(
    convexQuery(api.push.publicKey, {}),
  )
  const save = useMutation(api.push.subscribe)
  const remove = useMutation(api.push.unsubscribe)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  // Resynchronise l'appareil déjà abonné (idempotent) : le serveur le rattache au compte connecté.
  const refresh = useCallback(async () => {
    if (!isSupported()) return setSubscribed(false)
    const subscription = await currentSubscription()
    if (subscription) await save(keysOf(subscription)).catch(() => undefined)
    setSubscribed(subscription !== null)
  }, [save])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const status: PushStatus = (() => {
    if (isPending || subscribed === null) return 'loading'
    if (!isSupported())
      return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
    if (!publicKey) return 'not-configured'
    if (subscribed) return 'on'
    return Notification.permission === 'denied' ? 'denied' : 'off'
  })()

  async function enable() {
    if (!publicKey) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return void (await refresh())
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
    })
    await navigator.serviceWorker.ready
    // Refus du navigateur (navigation privée, service push injoignable) : message lisible via `errorMessage`.
    const subscription = await registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      })
      .catch(() => {
        throw new ConvexError(
          'Ce navigateur a refusé l’abonnement. En navigation privée, les notifications ne sont pas disponibles.',
        )
      })
    try {
      await save(keysOf(subscription))
    } catch (error) {
      await subscription.unsubscribe() // pas d'abonnement local que le serveur ignore
      throw error
    }
    setSubscribed(true)
  }

  async function disable() {
    await forgetThisDevice((endpoint) => remove({ endpoint }))
    setSubscribed(false)
  }

  return { status, enable, disable }
}
