import { PlaceholderPage } from '@/components/PlaceholderPage'

export function HomeLayoutPage() {
  return (
    <PlaceholderPage
      title="Customer Home Layout"
      description="Choose what appears on the customer app's Home screen, and in what order."
      waitingOn="the customer app's public discovery API"
      planned={[
        {
          title: 'Campaign banner',
          items: [
            'Big banner at the top, e.g. "موسم المشاوي"',
            'Title, subtitle, image, which page it opens',
            'Start and end date, and which cities see it',
          ],
        },
        {
          title: 'Food categories row',
          items: [
            'The sliding round photos (grills, masgouf, shawarma, burger...)',
            'Upload a photo per category, drag to reorder, hide/show',
            'A separate list for Healthy mode (salads, juices, bowls...)',
          ],
        },
        {
          title: 'Home sections',
          items: [
            'Turn on/off and reorder: Recommended, Under 5,000 banner, Spotlight, LiGETA critics, Moods, Upcoming events',
            'Spotlight is filled from paid placements on the Advertising page',
          ],
        },
        {
          title: 'Moods & collections',
          items: [
            'Mood tiles are managed on the Customer Moods page',
            'Hand-picked collections, e.g. "Authentic Iraqi food"',
          ],
        },
        {
          title: 'Under 5,000 tab (inside Offers)',
          items: [
            'Price limit (default 5,000 IQD), taken from real menu prices',
            'Hide a dish if its price looks wrong',
          ],
        },
      ]}
    />
  )
}
