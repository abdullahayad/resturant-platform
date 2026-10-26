import { PlaceholderPage } from '@/components/PlaceholderPage'

export function ReviewerLevelsPage() {
  return (
    <PlaceholderPage
      title="Levels & Critics"
      description="The 5 customer levels, the rules for reaching each, and the public critics customers can follow."
      waitingOn="customer accounts, verified visits and helpful votes on the backend"
      planned={[
        {
          title: 'Level rules (editable)',
          items: [
            '1 New taster: signed up',
            '2 Explorer: 3 verified visits + 1 review',
            '3 Taster: 10 visits + 5 reviews with photos',
            '4 Critic: 25 reviews + 50 helpful votes + account 3 months old (can become public)',
            '5 LiGETA Star: chosen by an admin',
          ],
        },
        {
          title: 'Critics',
          items: [
            'Public critics with followers, reviews and helpful votes',
            'Promote to LiGETA Star',
            'Remove a level for paid reviews that were not disclosed',
          ],
        },
        {
          title: 'Close to the next level',
          items: ['Customers who are almost a Critic - to check before they go public'],
        },
      ]}
    />
  )
}
