const TOKEN_KEY = 'admin_token'
const ADMIN_KEY = 'admin_profile'

export interface AdminProfile {
  id: string
  fullName: string
  role: 'SUPER_ADMIN' | 'MODERATOR'
  email: string
}

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getAdmin: (): AdminProfile | null => {
    const raw = localStorage.getItem(ADMIN_KEY)
    return raw ? JSON.parse(raw) : null
  },
  setSession: (token: string, admin: AdminProfile) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_KEY)
  },
}
