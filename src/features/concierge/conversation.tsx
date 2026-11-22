import { useEffect, useRef, useState } from 'react'
import { ArrowUpIcon, SparklesIcon } from 'lucide-react'
import { QUICK_ACTIONS, QUICK_ACTION_IDS } from '../../../convex/lib/concierge/quick'
import type { Audience } from '../../../convex/lib/concierge/quick'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useT } from '#/i18n/i18n'
import { ReplyCards } from './reply-cards'
import type { Entry, useConcierge } from './use-concierge'

const MAX_CHARS = 800

/** Fil de la conversation : questions à droite, réponses à gauche avec leur origine et leurs cartes. */
export function Thread({ entries, pending }: { entries: Array<Entry>; pending: boolean }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length, pending])
  return (
    <ol aria-live="polite" className="flex flex-col gap-5">
      {entries.map((entry) => (
        <li key={entry.id} className={cn('flex flex-col gap-2', entry.role === 'user' && 'items-end')}>
          {entry.role === 'user' ? (
            <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">{entry.text}</p>
          ) : (
            <Answer entry={entry} />
          )}
        </li>
      ))}
      {pending && <Typing />}
      <div ref={end} />
    </ol>
  )
}

function Answer({ entry }: { entry: Extract<Entry, { role: 'assistant' }> }) {
  const t = useT()
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SparklesIcon aria-hidden className={cn('size-3.5', entry.source === 'ai' && 'text-primary')} />
        {entry.source === 'ai' ? t('IA, chiffres vérifiés') : t('Sans IA')}
      </span>
      {/* Réponse IA : texte du modèle déjà revérifié. Sans IA : phrase fixe, traduite. */}
      <p className="text-[0.9375rem] leading-relaxed">{entry.source === 'ai' ? entry.text : t(entry.text)}</p>
      {entry.notice && <p className="text-xs text-muted-foreground">{t(entry.notice)}</p>}
      <ReplyCards cards={entry.cards} />
    </div>
  )
}

function Typing() {
  const t = useT()
  return (
    <li className="flex items-center gap-1.5 py-1" aria-label={t('Réponse en cours')}>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="size-2 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </li>
  )
}

/** Saisie : raccourcis sans IA du rôle, champ qui grandit avec le texte, Entrée pour envoyer. */
export function Composer({ audience, concierge }: { audience: Audience; concierge: ReturnType<typeof useConcierge> }) {
  const t = useT()
  const [text, setText] = useState('')
  const question = text.trim()
  const submit = () => {
    if (!question || concierge.pending) return
    setText('')
    void concierge.send(question)
  }
  return (
    <div className="flex flex-col gap-2 border-t bg-background/80 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
      <FormError message={concierge.error} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label={t('Raccourcis sans IA')}>
        {QUICK_ACTION_IDS.filter((id) => QUICK_ACTIONS[id].audience === audience).map((id) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            className="shrink-0 rounded-full"
            disabled={concierge.pending}
            onClick={() => void concierge.shortcut(id, t(QUICK_ACTIONS[id].label))}
          >
            {t(QUICK_ACTIONS[id].label)}
          </Button>
        ))}
      </div>
      <form
        className="flex items-end gap-2 rounded-3xl border bg-card p-1.5 pl-4 shadow-xs focus-within:ring-3 focus-within:ring-ring/40"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="concierge-input" className="sr-only">
          {t('Votre question')}
        </label>
        <textarea
          id="concierge-input"
          rows={1}
          maxLength={MAX_CHARS}
          value={text}
          placeholder={t('Posez votre question…')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <Button type="submit" size="icon" className="size-9 shrink-0 rounded-full" disabled={!question || concierge.pending} aria-label={t('Envoyer')}>
          <ArrowUpIcon />
        </Button>
      </form>
    </div>
  )
}
