import { PlaceholderPage } from '@/components/PlaceholderPage'

// Separate from Notifications (which messages restaurants in the partner
// app) - these go to customers' phones, so they get their own audience
// targeting and send limits.
export function CustomerCampaignsPage() {
  return (
    <PlaceholderPage
      title="Customer Push Campaigns"
      description="Push notifications sent to customers' phones, e.g. a new seasonal campaign or offers in their area."
      waitingOn="the customer app and its push tokens"
      planned={[
        {
          title: 'New campaign',
          items: [
            'Title and message in Arabic and English',
            'Opens: a restaurant, an offer, an event, a category, or the Under 5,000 tab',
            'Send now or schedule',
          ],
        },
        {
          title: 'Audience',
          items: [
            'City / area',
            'Level (e.g. only critics)',
            'Followers of a specific restaurant',
            'Healthy-mode users',
          ],
        },
        {
          title: 'Safety limits',
          items: [
            'Maximum pushes per customer per week, so people do not turn notifications off',
            'Preview count of how many phones will receive it before sending',
          ],
        },
        {
          title: 'History',
          items: ['Sent campaigns with how many received and opened them'],
        },
      ]}
    />
  )
}
