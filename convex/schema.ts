import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { notificationCategoryValidator, pushLocaleValidator } from './lib/notifications'

export const roleValidator = v.union(
  v.literal('admin'),
  v.literal('student'),
  v.literal('parent'),
  v.literal('chef'),
  v.literal('distribution'),
)

export const serviceValidator = v.union(v.literal('lunch'), v.literal('dinner'))
export const menuStatusValidator = v.union(v.literal('draft'), v.literal('published'))

/** Allergènes déclarés : « unknown » signifie non renseigné, jamais « absent » (#13). */
export const allergenInfoValidator = v.union(
  v.object({ status: v.literal('unknown') }),
  v.object({
    status: v.literal('declared'),
    present: v.array(v.string()),
    traces: v.array(v.string()),
  }),
)

export const recipeLineValidator = v.object({
  ingredientId: v.id('ingredients'),
  quantity: v.number(),
  unitId: v.id('units'),
})

/** Politique de réservation propre à l'établissement (voir convex/lib/policy.ts pour les valeurs par défaut). */
export const policyValidator = v.object({
  /** Heure de début de chaque service, « HH:MM » heure d'Abidjan (UTC+0). */
  serviceStart: v.object({ lunch: v.string(), dinner: v.string() }),
  /** Réservation et annulation fermées N minutes avant le début du service. */
  cutoffMinutes: v.number(),
  /** Montant maximal d'une recharge de démonstration. */
  demoTopUpMaxXof: v.number(),
})

export const walletEntryKindValidator = v.union(
  v.literal('demo_top_up'),
  v.literal('booking_debit'),
  v.literal('booking_refund'),
)

export default defineSchema({
  /** Établissement (tenant). Toute donnée métier y est rattachée. */
  canteens: defineTable({
    name: v.string(),
    slug: v.string(),
    policy: v.optional(policyValidator),
  }).index('by_slug', ['slug']),

  /** Solde courant d'un membre ; toujours égal à la somme de ses écritures. */
  wallets: defineTable({
    canteenId: v.id('canteens'),
    profileId: v.id('profiles'),
    balanceXof: v.number(),
  }).index('by_profile', ['profileId']),

  /** Journal en ajout seul : aucune écriture n'est modifiée ni supprimée. */
  walletEntries: defineTable({
    canteenId: v.id('canteens'),
    walletId: v.id('wallets'),
    kind: walletEntryKindValidator,
    amountXof: v.number(),
    balanceAfterXof: v.number(),
    bookingId: v.optional(v.id('bookings')),
    label: v.string(),
    idempotencyKey: v.optional(v.string()),
  })
    .index('by_wallet', ['walletId'])
    .index('by_wallet_key', ['walletId', 'idempotencyKey']),

  bookings: defineTable({
    canteenId: v.id('canteens'),
    profileId: v.id('profiles'),
    menuItemId: v.id('menuItems'),
    date: v.string(),
    service: serviceValidator,
    dishName: v.string(),
    priceXof: v.number(),
    status: v.union(v.literal('confirmed'), v.literal('cancelled'), v.literal('picked_up')),
    idempotencyKey: v.string(),
  })
    .index('by_profile_date', ['profileId', 'date'])
    .index('by_profile_key', ['profileId', 'idempotencyKey'])
    .index('by_menu_item_status', ['menuItemId', 'status'])
    .index('by_canteen_date', ['canteenId', 'date'])
    .index('by_canteen_date_service', ['canteenId', 'date', 'service'])
    .index('by_canteen_date_status', ['canteenId', 'date', 'status']),

  /**
   * Projection métier d'un compte Better Auth. Absente = compte inscrit mais non rattaché :
   * aucun accès aux données d'un établissement (SEC-02, #16).
   */
  profiles: defineTable({
    authUserId: v.string(),
    canteenId: v.id('canteens'),
    role: roleValidator,
    /** Nom affiché au personnel (copie du nom d'inscription au rattachement ; pas d'e-mail). */
    displayName: v.optional(v.string()),
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_canteen_role', ['canteenId', 'role']),

  /**
   * Abonnement Web Push d'un appareil (un navigateur = un `endpoint`). Rattaché au membre qui l'a activé :
   * le même appareil réactivé par un autre compte change de propriétaire. Aucune donnée personnelle ici.
   */
  pushSubscriptions: defineTable({
    canteenId: v.id('canteens'),
    profileId: v.id('profiles'),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    /** Langue des textes envoyés à cet appareil (langue de l'application à l'abonnement). Absent = français. */
    locale: v.optional(pushLocaleValidator),
  })
    .index('by_endpoint', ['endpoint'])
    .index('by_profile', ['profileId'])
    .index('by_canteen', ['canteenId']),

  /** Familles de notifications coupées par un membre (absent = tout reçu). Vaut pour tous ses appareils. */
  notificationPreferences: defineTable({
    profileId: v.id('profiles'),
    muted: v.array(notificationCategoryValidator),
  }).index('by_profile', ['profileId']),

  /** Rappels « clôture des réservations » déjà envoyés : un seul par établissement, jour et service. */
  pushReminders: defineTable({
    canteenId: v.id('canteens'),
    date: v.string(),
    service: serviceValidator,
  }).index('by_canteen_date_service', ['canteenId', 'date', 'service']),

  /** Unités de mesure propres à l'établissement, créables au point d'usage. */
  units: defineTable({
    canteenId: v.id('canteens'),
    name: v.string(),
    key: v.string(),
  }).index('by_canteen_key', ['canteenId', 'key']),

  ingredients: defineTable({
    canteenId: v.id('canteens'),
    name: v.string(),
    key: v.string(),
  }).index('by_canteen_key', ['canteenId', 'key']),

  /** Plat du catalogue, avec fiche recette légère (#13 A1). */
  dishes: defineTable({
    canteenId: v.id('canteens'),
    name: v.string(),
    description: v.optional(v.string()),
    defaultPriceXof: v.number(),
    allergens: allergenInfoValidator,
    recipe: v.object({ portions: v.number(), lines: v.array(recipeLineValidator) }),
  }).index('by_canteen', ['canteenId']),

  /** Plat proposé un jour/service donné. Prix figé sur l'offre ; les réservations le figeront à leur tour. */
  menuItems: defineTable({
    canteenId: v.id('canteens'),
    date: v.string(),
    service: serviceValidator,
    dishId: v.id('dishes'),
    priceXof: v.number(),
    capacity: v.number(),
    status: menuStatusValidator,
  })
    .index('by_canteen_date', ['canteenId', 'date'])
    .index('by_canteen_status_date', ['canteenId', 'status', 'date'])
    .index('by_dish_status', ['dishId', 'status']),

  /** Smart Menu (B1) : quotas et coût IA par usager et par jour. Aucun texte de requête conservé. */
  aiUsage: defineTable({
    canteenId: v.id('canteens'),
    profileId: v.id('profiles'),
    day: v.string(),
    calls: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  })
    .index('by_profile_day', ['profileId', 'day'])
    .index('by_canteen_day', ['canteenId', 'day']),
})
