import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'

/** Portions engagées sur une offre : réservations confirmées et retirées. */
export async function activeBookingsCount(ctx: QueryCtx, menuItemId: Id<'menuItems'>): Promise<number> {
  const [confirmed, pickedUp] = await Promise.all(
    (['confirmed', 'picked_up'] as const).map((status) =>
      ctx.db
        .query('bookings')
        .withIndex('by_menu_item_status', (q) => q.eq('menuItemId', menuItemId).eq('status', status))
        .collect(),
    ),
  )
  return confirmed.length + pickedUp.length
}
