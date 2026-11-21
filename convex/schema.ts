import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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

export default defineSchema({
  /** Établissement (tenant). Toute donnée métier y est rattachée. */
  canteens: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index('by_slug', ['slug']),

  /**
   * Projection métier d'un compte Better Auth. Absente = compte inscrit mais non rattaché :
   * aucun accès aux données d'un établissement (SEC-02, #16).
   */
  profiles: defineTable({
    authUserId: v.string(),
    canteenId: v.id('canteens'),
    role: roleValidator,
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_canteen_role', ['canteenId', 'role']),

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
    .index('by_canteen_status_date', ['canteenId', 'status', 'date']),
})
