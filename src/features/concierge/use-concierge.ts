import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Reply } from '../../../convex/lib/concierge/cards'
import type { QuickActionId } from '../../../convex/lib/concierge/quick'
import { useServerAction } from '#/lib/server-action'
import { useLocale } from '#/i18n/i18n'

export type Entry = { id: string; role: 'user'; text: string } | ({ id: string; role: 'assistant' } & Reply)

/**
 * Conversation de l'assistant : en mémoire de la page seulement (rien n'est conservé côté serveur).
 * Chaque envoi transmet l'historique ; le serveur le borne et le revérifie.
 */
export function useConcierge() {
  const { locale } = useLocale()
  const [entries, setEntries] = useState<Array<Entry>>([])
  const ask = useServerAction(useAction(api.concierge.ask))
  const quick = useServerAction(useAction(api.concierge.quick))
  const append = (entry: Entry) => setEntries((list) => [...list, entry])
  const answer = (reply: Reply | undefined) => reply && append({ id: crypto.randomUUID(), role: 'assistant', ...reply })

  async function send(text: string) {
    const question: Entry = { id: crypto.randomUUID(), role: 'user', text }
    const history = [...entries, question].map(({ role, text: content }) => ({ role, text: content }))
    append(question)
    answer(await ask.run({ messages: history, locale }))
  }

  async function shortcut(action: QuickActionId, label: string) {
    append({ id: crypto.randomUUID(), role: 'user', text: label })
    answer(await quick.run({ action }))
  }

  return {
    entries,
    send,
    shortcut,
    pending: ask.pending || quick.pending,
    error: ask.error ?? quick.error,
    reset: () => setEntries([]),
  }
}
