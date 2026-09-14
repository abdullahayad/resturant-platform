import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type FeaturedPlacementItem,
  type FeaturedStatus,
  type RestaurantListItem,
} from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'

const filters: { key: FeaturedStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending Requests' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
]

const statusTones: Record<FeaturedStatus, StatusPillTone> = {
  PENDING: 'primary',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

function formatDateRange(p: FeaturedPlacementItem) {
  if (!p.startDate && !p.endDate) return 'Open-ended'
  const from = p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'
  const until = p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'
  return `${from} – ${until}`
}

export function AdvertisingPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FeaturedStatus | 'ALL'>('PENDING')
  const [placements, setPlacements] = useState<FeaturedPlacementItem[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [grantRestaurantId, setGrantRestaurantId] = useState('')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .featured(filter === 'ALL' ? undefined : filter)
      .then(setPlacements)
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

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      await api.moderateFeatured(id, { status: 'APPROVED' })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async (id: string) => {
    setBusyId(id)
    try {
      await api.moderateFeatured(id, { status: 'REJECTED', rejectionReason: rejectionReason || undefined })
      setRejectingId(null)
      setRejectionReason('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const revoke = async (id: string) => {
    setBusyId(id)
    try {
      await api.revokeFeatured(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const grant = async () => {
    setGranting(true)
    try {
      await api.grantFeatured({ restaurantId: grantRestaurantId, note: grantNote || undefined })
      setGrantRestaurantId('')
      setGrantNote('')
      load()
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Advertising</h1>
        <p className="text-sm text-muted-foreground">
          Feature a restaurant for extra visibility — approve a restaurant's request, or grant it directly.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-primary">Grant Featured Status Directly</div>
        <div className="flex flex-wrap gap-2">
          <select
            value={grantRestaurantId}
            onChange={(e) => setGrantRestaurantId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a restaurant…</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.nameEn} · {r.codeNumber}</option>
            ))}
          </select>
          <input
            value={grantNote}
            onChange={(e) => setGrantNote(e.target.value)}
            placeholder="Internal note (optional, e.g. why)"
            className="min-w-[240px] flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={grant}
            disabled={!grantRestaurantId || granting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {granting ? 'Granting…' : 'Grant Featured'}
          </button>
        </div>
      </div>

      <FilterTabs options={filters} active={filter} onChange={setFilter} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {placements.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.restaurant.nameEn}</span>
                  <span className="text-muted-foreground">· {p.restaurant.codeNumber}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {p.initiator === 'RESTAURANT' ? 'Requested by restaurant' : 'Granted by admin'}
                  </span>
                  {p.isCurrentlyActive && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Live now</span>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">Window: </span>{formatDateRange(p)}
                </div>
                {p.reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {p.reason}</p>}
                {p.note && <p className="mt-1 text-sm text-muted-foreground">Note: {p.note}</p>}
                {p.status === 'REJECTED' && p.rejectionReason && (
                  <p className="mt-1 text-sm text-destructive">Rejected: {p.rejectionReason}</p>
                )}
              </div>
              <StatusPill className="shrink-0" label={p.status} tone={statusTones[p.status]} />
            </div>

            <div className="mt-3 space-y-2">
              {p.status === 'PENDING' && (
                rejectingId === p.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      className="min-w-[240px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      disabled={busyId === p.id}
                      onClick={() => confirmReject(p.id)}
                      className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectionReason('') }}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => approve(p.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => setRejectingId(p.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )
              )}
              {p.status === 'APPROVED' && p.isActive && (
                <button
                  disabled={busyId === p.id}
                  onClick={() => revoke(p.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
              {p.status === 'APPROVED' && !p.isActive && (
                <span className="text-xs text-muted-foreground">Revoked</span>
              )}
            </div>
          </div>
        ))}
        {!loading && placements.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing in this filter.
          </div>
        )}
      </div>
    </div>
  )
}
