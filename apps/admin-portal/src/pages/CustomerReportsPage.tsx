import { PlaceholderPage } from '@/components/PlaceholderPage'

export function CustomerReportsPage() {
  return (
    <PlaceholderPage
      title="Reported & Blocked"
      description="Customers reported by restaurants or other customers, and everyone currently blocked."
      waitingOn="customer accounts on the backend"
      planned={[
        {
          title: 'Reports queue',
          items: [
            'Who reported, who was reported, the reason and the linked review/photo',
            'Reasons: fake review, abusive language, spam, paid review not disclosed, no-show bookings',
            'Actions: dismiss, warn, remove content, block',
          ],
        },
        {
          title: 'Blocked customers',
          items: [
            'Reason, blocked by which admin, and when',
            'Unblock with a note (kept in Recent Activity)',
          ],
        },
      ]}
    />
  )
}
