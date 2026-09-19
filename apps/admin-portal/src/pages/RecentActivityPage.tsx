import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Image as ImageIcon, Percent, CalendarClock, ShieldAlert } from 'lucide-react'
import { api, UnauthorizedError, type AdminActivityItem } from '@/lib/api'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

function describe(item: AdminActivityItem): string {
  switch (item.type) {
    case 'dish':
      return `added a new dish — ${item.nameEn} · ${item.nameAr}`
    case 'photo':
      return `added a new photo (${item.album.toLowerCase()} album)`
    case 'promotion':
      return `created a promotion — ${item.titleEn} · ${item.titleAr}`
    case 'event':
      return `added an event — ${item.titleEn} · ${item.titleAr}`
    case 'blockedUpload':
      return `tried to upload a photo the AI reviewer flagged as inappropriate (${item.originalName}) — it was blocked, never stored`
  }
}

const icons = { dish: UtensilsCrossed, photo: ImageIcon, promotion: Percent, event: CalendarClock, blockedUpload: ShieldAlert }

export function RecentActivityPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .adminActivity(page)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }, [page, navigate])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Recent Activity</h1>
        <p className="text-sm text-muted-foreground">
          What restaurants are adding across the whole platform — new dishes, photos, promotions, and events —
          newest first. Since everything goes live the moment a restaurant adds it, this is the place to spot-check
          what's changing without reviewing every restaurant one by one. Photos the AI reviewer blocked as
          inappropriate show up here too, highlighted in red.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map((item) => {
          const Icon = icons[item.type]
          const isBlocked = item.type === 'blockedUpload'
          return (
            <div key={`${item.type}-${item.id}`} className={`flex items-start gap-3 px-4 py-3 ${isBlocked ? 'bg-destructive/5' : ''}`}>
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                  isBlocked ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  {item.restaurant ? (
                    <>
                      <span className="font-semibold">{item.restaurant.nameEn}</span>{' '}
                      <span className="text-muted-foreground">({item.restaurant.codeNumber})</span>{' '}
                    </>
                  ) : (
                    <span className="font-semibold">An admin</span>
                  )}
                  <span className={isBlocked ? 'text-destructive' : undefined}>{describe(item)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
            </div>
          )
        })}
        {!loading && items.length === 0 && !error && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">No activity yet.</div>
        )}
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
