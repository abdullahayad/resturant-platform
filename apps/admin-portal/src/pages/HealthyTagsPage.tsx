import { PlaceholderPage } from '@/components/PlaceholderPage'

// The healthy tag drives the customer app's Healthy mode, so it is approved
// here rather than self-declared by restaurants in the partner app.
export function HealthyTagsPage() {
  return (
    <PlaceholderPage
      title="Healthy Tag Requests"
      description="Restaurants ask for the 🌿 Healthy tag from the partner app; it only appears in the customer app's Healthy mode after an admin approves it."
      waitingOn="a 'request healthy tag' option in the partner app"
      planned={[
        {
          title: 'Requests queue',
          items: [
            'Restaurant, which dishes it marks as healthy, with photos',
            'Approve / reject with a reason the restaurant sees',
          ],
        },
        {
          title: 'Tagged restaurants',
          items: [
            'All restaurants currently tagged healthy',
            'Remove the tag (e.g. after customer complaints)',
          ],
        },
      ]}
    />
  )
}
