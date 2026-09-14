import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type RestaurantListItem } from '@/lib/api'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

function RequestRow({
  r,
  sentAt,
  statusLabel,
  statusTone,
  children,
}: {
  r: RestaurantListItem
  sentAt: string | null
  statusLabel: string
  statusTone: StatusPillTone
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{r.nameEn} <span className="text-muted-foreground">· {r.nameAr}</span></span>
            <span className="text-xs text-muted-foreground">{r.codeNumber}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            From {r.province?.nameEn ?? 'Unknown city'}{r.district ? `, ${r.district.nameEn}` : ''} · {r.phone} · {r.ownerEmail}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Sent {sentAt ? new Date(sentAt).toLocaleString() : '—'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusPill label={statusLabel} tone={statusTone} />
          {children}
        </div>
      </div>
    </div>
  )
}

function SignupApprovalSection() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .restaurants({ status: 'PENDING_REVIEW', page })
      .then((res) => {
        setRestaurants(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      if (action === 'approve') await api.approve(id)
      else await api.reject(id, 'Does not meet listing requirements')
      load()
    } catch {
      setError('Action failed, try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Signup Approval ({total})</h2>
        <p className="text-sm text-muted-foreground">
          Requests from new restaurants registering on the platform.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && restaurants.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No pending restaurants right now.
        </div>
      )}

      <div className="space-y-3">
        {restaurants.map((r) => (
          <RequestRow
            key={r.id}
            r={r}
            sentAt={r.createdAt}
            statusLabel="Pending Signup"
            statusTone="muted"
          >
            <button
              disabled={busyId === r.id}
              onClick={() => act(r.id, 'approve')}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={busyId === r.id}
              onClick={() => act(r.id, 'reject')}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              Reject
            </button>
          </RequestRow>
        ))}
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}

function ReviewApprovalSection() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .restaurants({ publishStatus: 'PENDING', page })
      .then((res) => {
        setRestaurants(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Review Approval ({total})</h2>
        <p className="text-sm text-muted-foreground">
          Requests from restaurants that submitted their profile for the one-time go-live review.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && restaurants.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No restaurants awaiting go-live review right now.
        </div>
      )}

      <div className="space-y-3">
        {restaurants.map((r) => (
          <RequestRow
            key={r.id}
            r={r}
            sentAt={r.publishSubmittedAt}
            statusLabel="Pending Review"
            statusTone="primary"
          >
            <button
              onClick={() => navigate(`/restaurants/${r.id}/publish-review`)}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
            >
              Review Submission
            </button>
          </RequestRow>
        ))}
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}

export function ApprovalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Restaurant Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Two independent approval stages: signup approval (new registrations) and review approval (go-live).
        </p>
      </div>

      <SignupApprovalSection />

      <div className="border-t border-border pt-8">
        <ReviewApprovalSection />
      </div>
    </div>
  )
}
