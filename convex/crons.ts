import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/** Rappel avant la clôture des réservations : toutes les 15 min, au plus un rappel par service (voir reminders.ts). */
crons.interval(
  'booking-cutoff-reminders',
  { minutes: 15 },
  internal.reminders.sendDue,
  {},
)

export default crons
