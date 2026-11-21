import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useMutation } from 'convex/react'
import { CameraIcon, Trash2Icon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { DishVisual } from '#/components/dish-visual'
import { FormError } from '#/components/form-error'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useT } from '#/i18n/i18n'

const MAX_SIDE = 1280

/**
 * Réduit la photo dans le navigateur avant l'envoi (1280 px au plus, WebP) : quelques centaines de Ko au lieu de
 * plusieurs Mo, essentiel en réseau lent. Si le navigateur ne sait pas encoder en WebP, on garde le JPEG.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82))
  const webp = await encode('image/webp')
  if (webp?.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg')
  if (!jpeg) throw new Error('encode')
  return jpeg
}

/**
 * Photo RÉELLE du plat, envoyée par l'administration. Modifiable même sur un plat publié (elle ne change ni la
 * composition, ni le prix, ni les allergènes). Succès affiché seulement après confirmation du serveur.
 */
export function DishPhoto({ dishId, name, photoUrl }: { dishId: Id<'dishes'>; name: string; photoUrl?: string }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const uploadUrl = useMutation(api.dishes.generatePhotoUploadUrl)
  const setPhoto = useMutation(api.dishes.setPhoto)

  async function run(task: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await task()
    } catch {
      setError(t('La photo n’a pas pu être enregistrée. Réessayez avec une image JPEG ou PNG.'))
    } finally {
      setPending(false)
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await run(async () => {
      const blob = await shrink(file)
      const response = await fetch(await uploadUrl(), { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })
      if (!response.ok) throw new Error('upload')
      const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
      await setPhoto({ dishId, photoId: storageId })
    })
  }

  return (
    <section aria-label={t('Photo du plat')} className="flex flex-col gap-3">
      <div className="relative">
        <DishVisual name={name} photoUrl={photoUrl} className="aspect-[16/9] w-full rounded-3xl text-4xl" />
        {pending && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl bg-background/70 backdrop-blur-sm">
            <Spinner className="size-6" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onFile} aria-hidden />
        <Button type="button" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
          <CameraIcon data-icon="inline-start" />
          {photoUrl ? t('Changer la photo') : t('Ajouter une photo')}
        </Button>
        {photoUrl && (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => run(async () => void (await setPhoto({ dishId, photoId: null })))}>
            <Trash2Icon data-icon="inline-start" />
            {t('Retirer')}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">{t('Photo réelle du plat servi, jamais une image d’illustration.')}</p>
      </div>
      <FormError message={error} />
    </section>
  )
}
