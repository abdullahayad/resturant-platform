import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { RequireAuth } from '@/components/RequireAuth'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { RestaurantsPage } from '@/pages/RestaurantsPage'
import { MasterDataPage } from '@/pages/MasterDataPage'
import { LocationsPage } from '@/pages/LocationsPage'
import { ReviewsPage } from '@/pages/ReviewsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PromotionsPage } from '@/pages/PromotionsPage'
import { AdvertisingPage } from '@/pages/AdvertisingPage'
import { LoyaltyPage } from '@/pages/LoyaltyPage'
import { EventBookingsPage } from '@/pages/EventBookingsPage'
import { PublishReviewPage } from '@/pages/PublishReviewPage'
import { ContentModerationPage } from '@/pages/ContentModerationPage'
import { FeatureFlagsPage } from '@/pages/FeatureFlagsPage'

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/:id/publish-review" element={<PublishReviewPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="content-moderation" element={<ContentModerationPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="advertising" element={<AdvertisingPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="event-bookings" element={<EventBookingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="feature-flags" element={<FeatureFlagsPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
