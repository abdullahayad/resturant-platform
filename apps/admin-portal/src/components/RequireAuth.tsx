import { Navigate, Outlet } from 'react-router-dom'
import { auth } from '@/lib/auth'

export function RequireAuth() {
  if (!auth.getToken()) return <Navigate to="/login" replace />
  return <Outlet />
}
