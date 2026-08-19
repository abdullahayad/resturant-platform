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

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
