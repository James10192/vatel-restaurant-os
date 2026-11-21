import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { CopyPlusIcon, LockIcon } from 'lucide-react'
import type { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { formatXof } from '#/lib/format'
import { DishForm } from '#/features/menus/dish-form'

export type CatalogDish = FunctionReturnType<typeof api.dishes.list>[number]

/**
 * Détail d'une fiche. Plat jamais publié : modifiable sur place. Plat publié : verrouillé (des usagers l'ont vu et
 * peut-être réservé), on crée une nouvelle version pré-remplie, à programmer ensuite dans Menus.
 */
export function DishDetail({ dish, onSaved }: { dish: CatalogDish; onSaved: (id: Id<'dishes'>) => void }) {
  const [mode, setMode] = useState<'edit' | 'version'>('edit')
  const versionOf = { ...dish, name: `${dish.name} (nouvelle version)` }
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">{dish.name}</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">{formatXof(dish.defaultPriceXof)}</span>
            {dish.published ? <Badge variant="secondary">Publié</Badge> : <Badge variant="outline">Jamais publié</Badge>}
            <span className="tabular-nums">
              {dish.recipe.lines.length} ingrédient{dish.recipe.lines.length > 1 ? 's' : ''} pour {dish.recipe.portions} portion
              {dish.recipe.portions > 1 ? 's' : ''}
            </span>
          </p>
        </div>
        {!dish.published && mode === 'edit' && (
          <Button variant="outline" onClick={() => setMode('version')}>
            <CopyPlusIcon data-icon="inline-start" />
            Nouvelle version
          </Button>
        )}
      </header>

      {dish.published && (
        <Alert>
          <LockIcon />
          <AlertTitle>Fiche verrouillée : ce plat est publié</AlertTitle>
          <AlertDescription>
            Les usagers l’ont vu et ont pu le réserver. Modifiez une nouvelle version, puis programmez-la dans Menus.
          </AlertDescription>
        </Alert>
      )}

      {dish.published || mode === 'version' ? (
        <DishForm key={`version-${dish._id}`} initial={versionOf} onSaved={onSaved} submitLabel="Créer la nouvelle version" />
      ) : (
        <DishForm key={`edit-${dish._id}`} initial={dish} dishId={dish._id} onSaved={onSaved} submitLabel="Enregistrer la fiche" />
      )}
    </div>
  )
}
