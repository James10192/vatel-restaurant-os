/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import schema from '../convex/schema'

const modules = import.meta.glob(['../convex/**/*.*s', '!../convex/**/*.test.ts'])

/** Lundi de référence des tests ; le déjeuner commence à 12:00 UTC (politique par défaut). */
export const WEEK = '2026-11-23'
/** Instant avant l'échéance du déjeuner du lundi (12:00 moins 120 min). */
export const BEFORE_CUTOFF = new Date('2026-11-23T08:00:00Z')

type Role = 'admin' | 'student'

/** Deux établissements A et B, un admin et trois étudiants dans A, un admin dans B. */
export async function setupCanteens() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const a = await ctx.db.insert('canteens', { name: 'Cantine A', slug: 'a' })
    const b = await ctx.db.insert('canteens', { name: 'Cantine B', slug: 'b' })
    const members: Array<[string, Id<'canteens'>, Role]> = [
      ['admin-a', a, 'admin'],
      ['student-a', a, 'student'],
      ['student-a2', a, 'student'],
      ['student-a3', a, 'student'],
      ['admin-b', b, 'admin'],
    ]
    for (const [authUserId, canteenId, role] of members) {
      await ctx.db.insert('profiles', { authUserId, canteenId, role, displayName: `Nom ${authUserId}` })
    }
    return { a, b }
  })
  const as = (subject: string) => t.withIdentity({ subject })
  return {
    t,
    ids,
    adminA: as('admin-a'),
    studentA: as('student-a'),
    studentA2: as('student-a2'),
    studentA3: as('student-a3'),
    adminB: as('admin-b'),
    stranger: as('nobody'),
  }
}

export type Fixture = Awaited<ReturnType<typeof setupCanteens>>
type User = Fixture['adminA']

export async function createDish(admin: User, name = 'Attiéké poisson', defaultPriceXof = 1500) {
  return await admin.mutation(api.dishes.save, {
    dish: {
      name,
      defaultPriceXof,
      allergens: { status: 'declared', present: ['Poisson'], traces: [] },
      recipe: { portions: 1, lines: [] },
    },
  })
}

/** Plat publié au déjeuner du lundi de référence. */
export async function publishedLunch(admin: User, capacity = 50, defaultPriceXof = 1500, date = WEEK) {
  const dishId = await createDish(admin, `Plat ${date} ${capacity}`, defaultPriceXof)
  const itemId = await admin.mutation(api.menus.addItem, { date, service: 'lunch', dishId, capacity })
  await admin.mutation(api.menus.publishWeek, { weekStart: date })
  return itemId
}
