import { v } from 'convex/values'
import type { Infer } from 'convex/values'

/**
 * Catalogue des notifications push. Textes fixes et génériques : jamais de nom, de solde, de plat réservé
 * ni de donnée d'un mineur, car ils s'affichent sur un écran verrouillé, parfois sur un appareil partagé.
 */
export const NOTIFICATIONS = {
  test: {
    title: 'Vatel Restauration',
    body: 'Les notifications fonctionnent sur cet appareil.',
    url: '/app/profile',
  },
  menuPublished: {
    title: 'Menus publiés',
    body: 'Les menus de la semaine sont disponibles. Réservez vos repas.',
    url: '/app',
  },
  lunchReminder: {
    title: 'Réservations du déjeuner',
    body: 'Elles ferment bientôt. Réservez votre repas avant la clôture.',
    url: '/app',
  },
  lowBalance: {
    title: 'Solde bas',
    body: 'Votre solde ne couvre bientôt plus un repas. Rechargez-le depuis l’application.',
    url: '/app/wallet',
  },
  dinnerReminder: {
    title: 'Réservations du dîner',
    body: 'Elles ferment bientôt. Réservez votre repas avant la clôture.',
    url: '/app',
  },
} as const

export const notificationKindValidator = v.union(
  v.literal('test'),
  v.literal('menuPublished'),
  v.literal('lunchReminder'),
  v.literal('dinnerReminder'),
  v.literal('lowBalance'),
)

export type NotificationKind = keyof typeof NOTIFICATIONS

/** Familles que chaque membre peut couper (pour tous ses appareils). */
export const NOTIFICATION_CATEGORIES = [
  'menuPublished',
  'bookingReminder',
  'lowBalance',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]
export const notificationCategoryValidator = v.union(
  v.literal('menuPublished'),
  v.literal('bookingReminder'),
  v.literal('lowBalance'),
)

/** Famille de chaque notification. Le test n'en a pas : c'est le membre lui-même qui le demande. */
export const CATEGORY_OF: Record<
  NotificationKind,
  NotificationCategory | null
> = {
  test: null,
  menuPublished: 'menuPublished',
  lunchReminder: 'bookingReminder',
  dinnerReminder: 'bookingReminder',
  lowBalance: 'lowBalance',
}

/** Seuil de l'alerte « solde bas » (FCFA, à peu près le prix d'un repas). Le montant n'est jamais affiché. */
export const LOW_BALANCE_XOF = 2000

/** Le rappel part dans l'heure qui précède la clôture des réservations d'un service. */
export const REMINDER_LEAD_MINUTES = 60

/** Destinataires : les appareils d'un membre, d'une liste de membres, ou de tout l'établissement. */
export const pushTargetValidator = v.union(
  v.object({ profileId: v.id('profiles') }),
  v.object({ profileIds: v.array(v.id('profiles')) }),
  v.object({ canteenId: v.id('canteens') }),
)
export type PushTarget = Infer<typeof pushTargetValidator>

/** Un membre ne garde pas plus d'appareils abonnés que ceci (borne les écritures et les envois). */
export const MAX_DEVICES_PER_MEMBER = 10

/**
 * Services push officiels des navigateurs. Le serveur n'envoie qu'à ces hôtes : un `endpoint` arbitraire
 * fourni par le client ferait de l'envoi une requête sortante vers n'importe quelle adresse (SSRF).
 */
const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'jmt17.google.com',
  'web.push.apple.com',
] // jmt17 : Chromium sans clés Google
const PUSH_HOST_SUFFIXES = [
  '.push.services.mozilla.com',
  '.notify.windows.com',
  '.push.apple.com',
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 2048) return false
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    return false
  return (
    PUSH_HOSTS.includes(url.hostname) ||
    PUSH_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
  )
}

/** Clés d'abonnement : base64url, longueur bornée (p256dh ~87 caractères, auth ~22). */
export const isPushKey = (value: string) =>
  /^[A-Za-z0-9_-]{16,128}={0,2}$/.test(value)
