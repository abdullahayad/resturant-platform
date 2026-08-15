import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { RestaurantsPage } from '@/pages/RestaurantsPage'
import { MasterDataPage } from '@/pages/MasterDataPage'
import { LocationsPage } from '@/pages/LocationsPage'
import { ReviewsPage } from '@/pages/ReviewsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="master-data" element={<MasterDataPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="admins" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  )
}

export default App
