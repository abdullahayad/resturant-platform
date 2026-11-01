import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type HealthyRestaurant, type HealthyStatus, type RestaurantListItem } from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'

type Filter = Exclude<HealthyStatus, 'NONE'> | 'ALL'

const filters: { key: Filter; label: string }[] = [
  { key: 'PENDING', label: 'Requests' },
  { key: 'APPROVED', label: 'Tagged healthy' },
  { key: 'REJECTED', label: 'Rejected / removed' },
  { key: 'ALL', label: 'All' },
]

const statusTones: Record<HealthyStatus, StatusPillTone> = {
  NONE: 'muted',
  PENDING: 'primary',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

const statusLabels: Record<HealthyStatus, string> = {
  NONE: 'Not requested',
  PENDING: 'Waiting',
  APPROVED: '🌿 Healthy',
  REJECTED: 'Rejected',
}

// The 🌿 Healthy tag drives the customer app's Healthy mode, so it is
// approved here rather than self-declared: restaurants mark their healthy
// dishes and ask for the tag from the partner app, and an admin decides.
// An admin can also grant it directly, or remove it later.
export function HealthyTagsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [rows, setRows] = useState<HealthyRestaurant[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [grantId, setGrantId] = useState('')

  const load = () => {
    setLoading(true)
    api
      .healthy(filter === 'ALL' ? undefined : filter)
      .then(setRows)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])
  useEffect(() => {
    api.restaurantsPicker('APPROVED').then(setRestaurants).catch(() => {})
  }, [])

  const decide = async (id: string, isHealthy: boolean, why?: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.setHealthy(id, isHealthy, why)
      setRejectingId(null)
      setReason('')
      load()
    } catch {
      setError('Could not save the decision.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Healthy Tag Requests</h1>
        <p className="text-sm text-muted-foreground">
          Restaurants mark their healthy dishes and ask for the 🌿 Healthy tag in the partner app. Only approved
          restaurants appear in the customer app's Healthy mode. Healthy dishes show in the Home "healthy dishes" row
          on their own, tag or not.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-primary">Give the tag directly</div>
        <div className="flex flex-wrap gap-2">
          <select
            value={grantId}
            onChange={(e) => setGrantId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a restaurant…</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameEn} · {r.codeNumber}
              </option>
            ))}
          </select>
          <button
            onClick={() => decide(grantId, true).then(() => setGrantId(''))}
            disabled={!grantId || busyId === grantId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Tag as Healthy
          </button>
        </div>
      </div>

      <FilterTabs options={filters} active={filter} onChange={setFilter} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.nameEn}</span>
                  <span className="text-muted-foreground">
                    · {r.codeNumber}
                    {r.district ? ` · ${r.district.nameEn}` : ''}
                  </span>
                </div>
                {r.healthyRequestedAt && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Asked on {new Date(r.healthyRequestedAt).toLocaleDateString()}
                  </div>
                )}
                {r.healthyRequestNote && <p className="mt-1 text-sm">“{r.healthyRequestNote}”</p>}
                {r.healthyStatus === 'REJECTED' && r.healthyRejectionReason && (
                  <p className="mt-1 text-sm text-destructive">Reason given: {r.healthyRejectionReason}</p>
                )}
              </div>
              <StatusPill className="shrink-0" label={statusLabels[r.healthyStatus]} tone={statusTones[r.healthyStatus]} />
            </div>

            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dishes marked healthy ({r.dishes.length})
              </div>
              {r.dishes.length === 0 ? (
                <p className="text-sm text-muted-foreground">None right now.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {r.dishes.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2 py-1.5">
                      {d.photoUrl ? (
                        <img src={d.photoUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-background" />
                      )}
                      <div className="text-sm">
                        <div>{d.nameEn}</div>
                        <div className="text-xs text-muted-foreground">{Number(d.price).toLocaleString()} IQD</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {rejectingId === r.id ? (
                <>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason the restaurant will see (required)"
                    className="min-w-[260px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={busyId === r.id || !reason.trim()}
                    onClick={() => decide(r.id, false, reason)}
                    className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                  >
                    {r.healthyStatus === 'APPROVED' ? 'Confirm remove' : 'Confirm reject'}
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null)
                      setReason('')
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {r.healthyStatus !== 'APPROVED' && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, true)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {r.healthyStatus !== 'REJECTED' && (
                    <button
                      onClick={() => setRejectingId(r.id)}
                      className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive"
                    >
                      {r.healthyStatus === 'APPROVED' ? 'Remove tag' : 'Reject'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
