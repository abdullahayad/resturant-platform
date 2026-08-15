import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type ModerationStatus, type ReviewItem } from '@/lib/api'
import { cn } from '@/lib/utils'

const filters: { key: ModerationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FLAGGED', label: 'Flagged' },
  { key: 'VISIBLE', label: 'Visible' },
  { key: 'HIDDEN', label: 'Hidden' },
]

const statusStyles: Record<ModerationStatus, string> = {
  VISIBLE: 'bg-success/15 text-success',
  FLAGGED: 'bg-primary/15 text-primary',
  HIDDEN: 'bg-destructive/15 text-destructive',
}

export function ReviewsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ModerationStatus | 'ALL'>('FLAGGED')
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .reviews(filter === 'ALL' ? undefined : filter)
      .then(setReviews)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const moderate = async (id: string, status: ModerationStatus) => {
    setBusyId(id)
    try {
      await api.moderateReview(id, status)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reviews Moderation</h1>
        <p className="text-sm text-muted-foreground">Hide or restore reported customer reviews.</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-3">
        {filters.map((f) => (
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
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">
                  {r.reviewerName} <span className="text-primary">{'★'.repeat(r.rating)}</span>
                  <span className="text-muted-foreground">{'★'.repeat(5 - r.rating)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.restaurant.nameEn} · {r.restaurant.codeNumber} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-xs', statusStyles[r.moderationStatus])}>
                {r.moderationStatus}
              </span>
            </div>

            {r.text && <p className="mt-2 text-sm">{r.text}</p>}
            {r.reply && (
              <div className="mt-2 rounded-lg bg-secondary/50 p-2 text-sm">
                <span className="text-xs text-muted-foreground">Restaurant reply: </span>
                {r.reply.text}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {r.moderationStatus !== 'HIDDEN' && (
                <button
                  disabled={busyId === r.id}
                  onClick={() => moderate(r.id, 'HIDDEN')}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                >
                  Hide
                </button>
              )}
              {r.moderationStatus !== 'VISIBLE' && (
                <button
                  disabled={busyId === r.id}
                  onClick={() => moderate(r.id, 'VISIBLE')}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && reviews.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No reviews in this filter.
          </div>
        )}
      </div>
    </div>
  )
}
