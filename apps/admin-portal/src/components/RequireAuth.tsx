import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth'

// The admin's auth cookie is httpOnly, so unlike the old localStorage check
// this page's own JS can't synchronously know "am I signed in" - it has to
// actually ask the server (GET /auth/admin/me) and wait for the answer.
export function RequireAuth() {
  const [status, setStatus] = useState<'checking' | 'authed' | 'anonymous'>('checking')

  useEffect(() => {
    api
      .me()
      .then(({ admin }) => {
        auth.setAdmin(admin)
        setStatus('authed')
      })
      .catch(() => {
        auth.clear()
        setStatus('anonymous')
      })
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    )
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return <Outlet />
}
