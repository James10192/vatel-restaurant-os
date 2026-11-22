import type { Card } from '../../../convex/lib/concierge/cards'
import { DayCardView, PointsCardView, SimulationCardView } from './kitchen-cards'
import { BalanceCardView, BookingsCardView, OffersCardView, PlanCardView } from './student-cards'

/** Une carte par type, construite par le serveur : l'interface ne rend jamais de contenu libre du modèle. */
function CardView({ card }: { card: Card }) {
  switch (card.kind) {
    case 'offers':
      return <OffersCardView card={card} />
    case 'balance':
      return <BalanceCardView />
    case 'bookings':
      return <BookingsCardView />
    case 'plan':
      return <PlanCardView card={card} />
    case 'day':
      return <DayCardView card={card} />
    case 'simulation':
      return <SimulationCardView card={card} />
    case 'points':
      return <PointsCardView card={card} />
  }
}

export function ReplyCards({ cards }: { cards: Array<Card> }) {
  if (cards.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {cards.map((card, i) => (
        <CardView key={`${card.kind}-${i}`} card={card} />
      ))}
    </div>
  )
}
