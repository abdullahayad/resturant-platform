import { PlaceholderPage } from '@/components/PlaceholderPage'

// Reserved slot in the Customers workspace - fills in once the customer app
// and its customer accounts exist on the backend.
export function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Every customer who signed up in the customer app with their WhatsApp number."
      waitingOn="customer accounts on the backend"
      planned={[
        {
          title: 'Customer list',
          items: [
            'Search by name or phone number',
            'Filter by city, level, sign-up date, last active',
            'Columns: name, phone, city, level, verified visits, reviews, joined',
          ],
        },
        {
          title: 'Customer detail',
          items: [
            'Bookings and verified visits (with which restaurant confirmed each)',
            'Reviews, photos and "helpful" votes received',
            'Restaurants and critics they follow',
            'Loyalty rewards earned and redeemed',
          ],
        },
        {
          title: 'Actions',
          items: [
            'Remove a fake visit or review',
            'Block / unblock the account',
            'Delete the account on request (privacy)',
          ],
        },
      ]}
    />
  )
}
