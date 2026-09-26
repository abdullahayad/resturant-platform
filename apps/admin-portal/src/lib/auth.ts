// The admin's JWT no longer lives here at all - it's an httpOnly cookie the
// server sets, which this page's own JS can never read (see the backend's
// adminAuthCookies.ts). Only the non-sensitive profile (for displaying
// "signed in as X") is kept, in memory only - not persisted, since there's
// nothing here to persist that the server can't just hand back again via
// GET /auth/admin/me on the next load (see checkAuth() below).
export interface AdminProfile {
  id: string
  fullName: string
  role: 'SUPER_ADMIN' | 'MODERATOR'
  email: string
}

let currentAdmin: AdminProfile | null = null

export const auth = {
  getAdmin: (): AdminProfile | null => currentAdmin,
  setAdmin: (admin: AdminProfile) => {
    currentAdmin = admin
  },
  clear: () => {
    currentAdmin = null
  },
}
