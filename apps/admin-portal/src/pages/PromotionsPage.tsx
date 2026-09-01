import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type PromotionItem, type PromotionStatus } from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'

const filters: { key: PromotionStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
]

const statusTones: Record<PromotionStatus, StatusPillTone> = {
  PENDING: 'primary',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDiscount(p: PromotionItem) {
  return p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}% off` : `${Number(p.discountValue).toLocaleString()} IQD off`
}

function formatScope(p: PromotionItem) {
  if (p.scope === 'WHOLE_MENU') return 'Whole menu'
  return `On: ${p.dishes.map((d) => d.dish.nameEn).join(', ') || '—'}`
}

function formatSchedule(p: PromotionItem) {
  if (p.isRecurring) {
    const day = p.recurringDayOfWeek != null ? dayNames[p.recurringDayOfWeek] : '—'
    return p.startTime && p.endTime ? `Every ${day}, ${p.startTime}–${p.endTime}` : `Every ${day} (all day)`
  }
  const from = p.validFrom ? new Date(p.validFrom).toLocaleDateString() : '—'
  const until = p.validUntil ? new Date(p.validUntil).toLocaleDateString() : '—'
  return `${from} – ${until}`
}

export function PromotionsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<PromotionStatus | 'ALL'>('PENDING')
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const load = () => {
    setLoading(true)
    api
      .promotions(filter === 'ALL' ? undefined : filter)
      .then(setPromotions)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      await api.moderatePromotion(id, 'APPROVED')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async (id: string) => {
    setBusyId(id)
    try {
      await api.moderatePromotion(id, 'REJECTED', rejectionReason || undefined)
      setRejectingId(null)
      setRejectionReason('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Promotions</h1>
        <p className="text-sm text-muted-foreground">Approve or reject restaurant-submitted discounts before they go live.</p>
      </div>

      <FilterTabs options={filters} active={filter} onChange={setFilter} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {promotions.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.titleEn}</span>
                  <span className="text-muted-foreground">· {p.titleAr}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.restaurant.nameEn} · {p.restaurant.codeNumber} · {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              <StatusPill label={p.status} tone={statusTones[p.status]} className="shrink-0" />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
              <div><span className="text-muted-foreground">Discount: </span>{formatDiscount(p)}</div>
              <div><span className="text-muted-foreground">Scope: </span>{formatScope(p)}</div>
              <div><span className="text-muted-foreground">Schedule: </span>{formatSchedule(p)}</div>
            </div>

            {p.descriptionEn && <p className="mt-2 text-sm text-muted-foreground">{p.descriptionEn}</p>}
            {p.status === 'REJECTED' && p.rejectionReason && (
              <p className="mt-2 text-sm text-destructive">Rejection reason: {p.rejectionReason}</p>
            )}

            {p.status === 'PENDING' && (
              <div className="mt-3 space-y-2">
                {rejectingId === p.id ? (
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
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && promotions.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No promotions in this filter.
          </div>
        )}
      </div>
    </div>
  )
}
