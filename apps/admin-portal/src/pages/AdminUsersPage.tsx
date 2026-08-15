import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type AdminUserItem } from '@/lib/api'
import { auth } from '@/lib/auth'

const emptyForm = { email: '', password: '', fullName: '', role: 'MODERATOR' as const }

export function AdminUsersPage() {
  const navigate = useNavigate()
  const me = auth.getAdmin()
  const [admins, setAdmins] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .adminUsers()
      .then(setAdmins)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else if (err instanceof Error && err.message.includes('403')) setForbidden(true)
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const createAdmin = async () => {
    setError(null)
    if (!form.email.trim() || !form.password || !form.fullName.trim()) return
    setCreating(true)
    try {
      const created = await api.createAdminUser(form)
      setAdmins((prev) => [...prev, created])
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create admin')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (admin: AdminUserItem) => {
    try {
      const updated = await api.updateAdminUser(admin.id, { isActive: !admin.isActive })
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const changeRole = async (admin: AdminUserItem, role: 'SUPER_ADMIN' | 'MODERATOR') => {
    try {
      const updated = await api.updateAdminUser(admin.id, { role })
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  if (forbidden) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Only super admins can manage admin accounts.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin Users</h1>
        <p className="text-sm text-muted-foreground">
          Super admins can manage other admin accounts; moderators handle day-to-day approvals only.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold text-primary">Add Admin</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Full name"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Password (min 8 chars)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof f.role }))}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="MODERATOR">Moderator</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
        <button
          onClick={createAdmin}
          disabled={creating}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Add Admin'}
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{admin.fullName}</td>
                <td className="px-4 py-2 text-muted-foreground">{admin.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={admin.role}
                    disabled={admin.id === me?.id}
                    onChange={(e) => changeRole(admin, e.target.value as 'SUPER_ADMIN' | 'MODERATOR')}
                    className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs outline-none disabled:opacity-50"
                  >
                    <option value="MODERATOR">Moderator</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(admin)}
                    disabled={admin.id === me?.id}
                    className={
                      admin.isActive
                        ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs text-success disabled:opacity-50'
                        : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground disabled:opacity-50'
                    }
                  >
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {admin.id === me?.id ? 'You' : ''}
                </td>
              </tr>
            ))}
            {admins.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No admins yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
