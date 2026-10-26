import { PlaceholderPage } from '@/components/PlaceholderPage'

export function CustomerSupportPage() {
  return (
    <PlaceholderPage
      title="Customer Support"
      description="Messages customers send from the Help screen in the customer app."
      waitingOn="customer accounts on the backend"
      planned={[
        {
          title: 'Inbox',
          items: [
            'Tabs: open, waiting on customer, closed',
            'Topics: booking problem, wrong restaurant info, login code not received, delete my account',
            'Reply, then the customer gets a notification',
          ],
        },
        {
          title: 'Context next to each message',
          items: [
            "The customer's recent bookings and visits",
            'Link to the restaurant involved, to fix its info directly',
          ],
        },
      ]}
    />
  )
}
