import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type RestaurantListItem } from '@/lib/api'

export function ApprovalsPage() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .restaurants('PENDING_REVIEW')
      .then(setRestaurants)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server. Is the backend running on localhost:3000?')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      if (action === 'approve') await api.approve(id)
      else await api.reject(id, 'Does not meet listing requirements')
      setRestaurants((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError('Action failed, try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Restaurant Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Queue of pending restaurant sign-ups: approve or reject.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && restaurants.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No pending restaurants right now.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {restaurants.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {r.nameEn} <span className="text-muted-foreground">· {r.nameAr}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{r.codeNumber}</div>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {r.status.replace('_', ' ')}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{r.phone}</dd>
              <dt className="text-muted-foreground">Owner email</dt>
              <dd className="truncate">{r.ownerEmail}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>
                {r.province?.nameEn ?? '—'}
                {r.district ? `, ${r.district.nameEn}` : ''}
              </dd>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{new Date(r.createdAt).toLocaleString()}</dd>
            </dl>

            <div className="mt-4 flex gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => act(r.id, 'approve')}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => act(r.id, 'reject')}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold text-foreground disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
