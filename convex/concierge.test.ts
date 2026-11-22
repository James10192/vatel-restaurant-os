import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { BEFORE_CUTOFF, WEEK, publishedLunch, setupCanteens } from '../tests/convex-fixture'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_CUTOFF)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const ask = (text: string) => ({ messages: [{ role: 'user' as const, text }] })

describe('concierge : raccourcis sans IA', () => {
  test('usager : menu, solde et réservations lus en base, en cartes de référence', async () => {
    const { adminA, studentA } = await setupCanteens()
    const menuItemId = await publishedLunch(adminA, 10)
    const menu = await studentA.action(api.concierge.quick, { action: 'menu_next' })
    expect(menu).toEqual({ source: 'rules', text: 'Voici le menu des prochains jours.', cards: [{ kind: 'offers', items: [{ menuItemId, date: WEEK }] }] })
    expect((await studentA.action(api.concierge.quick, { action: 'my_balance' })).cards).toEqual([{ kind: 'balance' }])
  })

  test('gestion : chiffres de demain et points du jour', async () => {
    const { adminA } = await setupCanteens()
    await publishedLunch(adminA, 10)
    expect((await adminA.action(api.concierge.quick, { action: 'today_figures' })).cards).toEqual([{ kind: 'day', date: WEEK }])
    const tomorrow = await adminA.action(api.concierge.quick, { action: 'tomorrow_figures' })
    expect(tomorrow).toMatchObject({ text: 'Rien à afficher pour le moment.', cards: [] })
    expect((await adminA.action(api.concierge.quick, { action: 'attention' })).cards[0]).toMatchObject({ kind: 'points', date: WEEK })
  })

  test('chaque public n’a que ses raccourcis', async () => {
    const { adminA, studentA } = await setupCanteens()
    await expect(studentA.action(api.concierge.quick, { action: 'today_figures' })).rejects.toThrow(/indisponible pour votre rôle/)
    await expect(adminA.action(api.concierge.quick, { action: 'my_balance' })).rejects.toThrow(/indisponible pour votre rôle/)
  })

  test('autre établissement : ne voit aucune offre de A', async () => {
    const { adminA, adminB } = await setupCanteens()
    await publishedLunch(adminA, 10)
    expect((await adminB.action(api.concierge.quick, { action: 'today_figures' })).cards).toEqual([])
  })
})

describe('concierge : conversation', () => {
  test('anonyme, compte non rattaché et distribution refusés', async () => {
    const { t, ids, stranger } = await setupCanteens()
    await expect(t.action(api.concierge.ask, ask('Bonjour'))).rejects.toThrow()
    await expect(stranger.action(api.concierge.ask, ask('Bonjour'))).rejects.toThrow()
    await t.run((ctx) => ctx.db.insert('profiles', { authUserId: 'dist-a', canteenId: ids.a, role: 'distribution', displayName: 'Dist' }))
    await expect(t.withIdentity({ subject: 'dist-a' }).action(api.concierge.ask, ask('Bonjour'))).rejects.toThrow(/réservé aux usagers/)
  })

  test('IA non configurée : réponse annoncée sans IA, aucun appel décompté', async () => {
    const { t, studentA } = await setupCanteens()
    vi.stubEnv('SMART_MENU_MODEL', '')
    const reply = await studentA.action(api.concierge.ask, ask('Que manger demain ?'))
    expect(reply).toMatchObject({ source: 'rules', cards: [] })
    expect(reply.notice).toMatch(/non configurée/)
    expect(await t.run((ctx) => ctx.db.query('aiUsage').collect())).toEqual([])
  })

  test('historique invalide refusé avant tout appel', async () => {
    const { studentA } = await setupCanteens()
    await expect(studentA.action(api.concierge.ask, { messages: [] })).rejects.toThrow(/question/)
    await expect(studentA.action(api.concierge.ask, ask('x'.repeat(900)))).rejects.toThrow(/trop long/)
  })
})
