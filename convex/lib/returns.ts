import { v } from 'convex/values'
import { paginationResultValidator } from 'convex/server'
import schema, { allergenInfoValidator, roleValidator, serviceValidator } from '../schema'
import { allergyAlertValidator } from './allergies'

/**
 * Validateurs de retour des requêtes publiques (règle AGENTS.md : args ET returns validés).
 * Construits depuis le schéma : un champ ajouté ou retiré d'une table se répercute ici, rien n'est recopié à la main.
 */
const { bookings, dishes, menuItems, walletEntries } = schema.tables
const bookingStatus = bookings.validator.fields.status

export const dayOrdersReturns = paginationResultValidator(
  v.object({
    _id: v.id('bookings'),
    _creationTime: v.number(),
    service: serviceValidator,
    dishName: v.string(),
    priceXof: v.number(),
    status: bookingStatus,
    slot: v.optional(v.string()),
    diner: v.string(),
  }),
)

const dayCounts = {
  /** Repas servis sans réservation (comptés au comptoir). */
  walkIns: v.number(),
  capacity: v.number(),
  confirmed: v.number(),
  pickedUp: v.number(),
  cancelled: v.number(),
  remaining: v.number(),
}

export const daySummaryReturns = v.object({
  offers: v.array(
    v.object({ menuItemId: v.id('menuItems'), service: serviceValidator, dishName: v.string(), priceXof: v.number(), ...dayCounts }),
  ),
  totals: v.object({ ...dayCounts, demoAmountXof: v.number() }),
})

export const dishListReturns = v.array(
  v.object({ _id: v.id('dishes'), _creationTime: v.number(), ...dishes.validator.fields, published: v.boolean(), photoUrl: v.optional(v.string()) }),
)

export const adminWeekReturns = v.array(
  v.object({
    _id: v.id('menuItems'),
    _creationTime: v.number(),
    ...menuItems.validator.fields,
    dishName: v.string(),
    allergens: allergenInfoValidator,
    photoUrl: v.optional(v.string()),
  }),
)

export const publishedWeekReturns = v.array(
  v.object({
    _id: v.id('menuItems'),
    date: v.string(),
    service: serviceValidator,
    priceXof: v.number(),
    capacity: v.number(),
    remaining: v.number(),
    bookableUntil: v.number(),
    dishName: v.string(),
    description: v.optional(v.string()),
    allergens: allergenInfoValidator,
    photoUrl: v.optional(v.string()),
    allergyAlert: v.optional(allergyAlertValidator),
  }),
)

export const myBookingsReturns = v.array(
  v.object({
    _id: v.id('bookings'),
    menuItemId: v.id('menuItems'),
    date: v.string(),
    service: serviceValidator,
    dishName: v.string(),
    priceXof: v.number(),
    status: bookingStatus,
    cancellableUntil: v.number(),
    slot: v.optional(v.string()),
  }),
)

export const walletHistoryReturns = paginationResultValidator(
  v.object({
    _id: v.id('walletEntries'),
    _creationTime: v.number(),
    kind: walletEntries.validator.fields.kind,
    amountXof: v.number(),
    balanceAfterXof: v.number(),
    label: v.string(),
  }),
)

export const currentUserReturns = v.union(
  v.null(),
  v.object({
    name: v.string(),
    email: v.string(),
    membership: v.union(v.null(), v.object({ role: roleValidator, canteenName: v.string() })),
  }),
)
