import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type RestaurantDetail, type RestaurantListItem, type RestaurantStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const statusFilters: { key: RestaurantStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
]

const statusStyles: Record<RestaurantStatus, string> = {
  PENDING_REVIEW: 'bg-secondary text-muted-foreground',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/15 text-destructive',
  SUSPENDED: 'bg-destructive/15 text-destructive',
}

export function RestaurantsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RestaurantStatus | 'ALL'>('ALL')
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RestaurantDetail | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .restaurants(filter === 'ALL' ? undefined : filter)
      .then(setRestaurants)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(id)
    setDetail(null)
    const full = await api.restaurant(id)
    setDetail(full)
  }

  const suspend = async (id: string) => {
    setBusyId(id)
    try {
      await api.suspend(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const reinstate = async (id: string) => {
    setBusyId(id)
    try {
      await api.approve(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Restaurants</h1>
        <p className="text-sm text-muted-foreground">
          View any restaurant's full profile, suspend a live listing, or reinstate one.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-3">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground',
              filter === f.key && 'bg-primary/10 text-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {restaurants.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <button onClick={() => toggleExpand(r.id)} className="text-left">
                <div className="font-semibold">
                  {r.nameEn} <span className="text-muted-foreground">· {r.nameAr}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.codeNumber} · {r.phone}</div>
              </button>
              <div className="flex items-center gap-3">
                <span className={cn('rounded-full px-2.5 py-1 text-xs', statusStyles[r.status])}>
                  {r.status.replace('_', ' ')}
                </span>
                {r.status === 'APPROVED' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => suspend(r.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {(r.status === 'SUSPENDED' || r.status === 'REJECTED') && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => reinstate(r.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
                  >
                    Reinstate
                  </button>
                )}
              </div>
            </div>

            {expandedId === r.id && (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                {!detail ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Owner email</div>
                      <div>{detail.ownerEmail}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div>
                        {detail.province?.nameEn ?? '—'}
                        {detail.district ? `, ${detail.district.nameEn}` : ''}
                        {detail.latitude != null && detail.longitude != null
                          ? ` (${detail.latitude}, ${detail.longitude})`
                          : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Business Types</div>
                      <div>{detail.businessTypes.map((b) => b.businessType.nameEn).join(', ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Food Categories</div>
                      <div>{detail.foodCategories.map((f) => f.foodCategory.nameEn).join(', ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Facilities</div>
                      <div>{detail.facilities.map((f) => f.facility.nameEn).join(', ') || '—'}</div>
                    </div>
                    {detail.rejectionReason && (
                      <div>
                        <div className="text-xs text-muted-foreground">Rejection Reason</div>
                        <div>{detail.rejectionReason}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && restaurants.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No restaurants in this filter.
          </div>
        )}
      </div>
    </div>
  )
}
