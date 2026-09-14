import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type ModerationStatus, type ReviewItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

const filters: { key: ModerationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FLAGGED', label: 'Flagged' },
  { key: 'VISIBLE', label: 'Visible' },
  { key: 'HIDDEN', label: 'Hidden' },
]

const statusTones: Record<ModerationStatus, StatusPillTone> = {
  VISIBLE: 'success',
  FLAGGED: 'primary',
  HIDDEN: 'destructive',
}

export function ReviewsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ModerationStatus | 'ALL'>('FLAGGED')
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .reviews(filter === 'ALL' ? undefined : filter, page)
      .then((res) => {
        setReviews(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, page])

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

      <FilterTabs
        options={filters}
        active={filter}
        onChange={(v) => {
          setFilter(v)
          setPage(1)
        }}
      />

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
              <StatusPill label={r.moderationStatus} tone={statusTones[r.moderationStatus]} />
            </div>

            {r.text && <p className="mt-2 text-sm">{r.text}</p>}
            {r.photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt=""
                    className={cn(
                      'h-16 w-16 rounded-lg object-cover',
                      photo.moderationStatus === 'HIDDEN' && 'opacity-40',
                    )}
                  />
                ))}
              </div>
            )}
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

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
