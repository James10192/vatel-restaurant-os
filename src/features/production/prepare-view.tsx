import { materialsFor, situationOf, sumMaterials } from '../../../convex/lib/production/plan'
import type { MaterialNeed } from '../../../convex/lib/production/plan'
import { DishProduction } from './dish-production'
import { MaterialsList } from './quantities'
import { baselineOf } from './types'
import type { ProductionOffer } from './types'
import { useT } from '#/i18n/i18n'

/**
 * Vue « Préparer » : en tête, ce qu'il reste à envoyer pour tout le service et la matière à sortir
 * (d'après les fiches techniques) ; puis un bloc par plat. Chiffres réels, aucune hypothèse ici.
 */
export function PrepareView({ offers, canRecord }: { offers: Array<ProductionOffer>; canRecord: boolean }) {
  const t = useT()
  const known = offers.flatMap((offer) => {
    const situation = situationOf(baselineOf(offer))
    return situation ? [{ offer, missing: situation.missing }] : []
  })
  const totalMissing = known.reduce((n, k) => n + k.missing, 0)
  const unknown = offers.length - known.length
  const perDish = known.filter((k) => k.missing > 0).map((k) => ({ offer: k.offer, needs: materialsFor(k.offer.recipe, k.missing) }))
  const withoutRecipe = perDish.filter((d) => d.needs === null).map((d) => d.offer.dishName)
  const materials = sumMaterials(perDish.map((d) => d.needs).filter((n): n is Array<MaterialNeed> => n !== null))

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <aside className="flex flex-col gap-4 rounded-3xl bg-vatel-navy p-5 text-white xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1">
        <div>
          <p className="text-sm text-white/70">{t('Reste à préparer pour ce service')}</p>
          <p className="text-5xl leading-none font-bold tracking-[-0.03em] tabular-nums">{totalMissing}</p>
          <p className="mt-1 text-xs text-white/60">
            {unknown > 0
              ? t(unknown > 1 ? '{n} plats sans saisie de cuisine, non comptés.' : '{n} plat sans saisie de cuisine, non compté.', { n: unknown })
              : t('Tous les plats ont une saisie de cuisine.')}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 text-foreground dark:bg-card">
          <h2 className="text-sm font-semibold">{t('Matière à sortir pour finir')}</h2>
          <MaterialsList needs={materials} emptyLabel={t('Rien à sortir pour l’instant.')} />
          {withoutRecipe.length > 0 && (
            <p className="text-xs text-muted-foreground">{t('Sans fiche technique : {dishes}.', { dishes: withoutRecipe.join(', ') })}</p>
          )}
        </div>
      </aside>

      <div className="grid gap-4 md:grid-cols-2 xl:col-start-1 xl:row-start-1">
        {offers.map((offer) => (
          <DishProduction key={offer.menuItemId} offer={offer} canRecord={canRecord} />
        ))}
      </div>
    </div>
  )
}
