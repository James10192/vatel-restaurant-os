import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const roleValidator = v.union(
  v.literal('admin'),
  v.literal('student'),
  v.literal('parent'),
  v.literal('chef'),
  v.literal('distribution'),
)

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
})
