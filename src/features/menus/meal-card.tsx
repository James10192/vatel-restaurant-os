import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { SERVICE_LABELS, formatXof } from '#/lib/format'
import { AllergenBadges } from './allergen-badges'

export type PublishedItem = FunctionReturnType<typeof api.menus.publishedWeek>[number]

/** Plat publié : prix lisible, service, informations alimentaires déclarées. */
export function MealCard({ item }: { item: PublishedItem }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit">
              {SERVICE_LABELS[item.service]}
            </Badge>
            <CardTitle className="text-base">{item.dishName}</CardTitle>
          </div>
          <span className="shrink-0 text-lg font-bold text-primary">{formatXof(item.priceXof)}</span>
        </div>
        {item.description && <CardDescription>{item.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
        <AllergenBadges allergens={item.allergens} />
      </CardContent>
    </Card>
  )
}
