import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Image as ImageIcon, Percent, CalendarClock, ShieldAlert, KeyRound, ChevronDown, ChevronRight } from 'lucide-react'
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
    case 'adminSupportSession':
      return `was accessed by ${item.adminName} via "Manage as this restaurant"`
  }
}

const icons = {
  dish: UtensilsCrossed,
  photo: ImageIcon,
  promotion: Percent,
  event: CalendarClock,
  blockedUpload: ShieldAlert,
  adminSupportSession: KeyRound,
}

// blockedUpload and adminSupportSession have nothing more to show - neither
// has any further content beyond what describe() above already says.
function isExpandable(item: AdminActivityItem): boolean {
  return item.type !== 'blockedUpload' && item.type !== 'adminSupportSession'
}

function Detail({ item }: { item: AdminActivityItem }) {
  switch (item.type) {
    case 'dish':
      return (
        <div className="flex gap-4">
          {item.photoUrl && <img src={item.photoUrl} alt="" className="size-24 shrink-0 rounded-lg object-cover" />}
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{item.nameEn} · {item.nameAr}</div>
            <div className="text-muted-foreground">{Number(item.price).toLocaleString()} IQD</div>
            {item.menuCategory && <div className="text-muted-foreground">{item.menuCategory.nameEn}</div>}
          </div>
        </div>
      )
    case 'photo':
      return (
        <div className="space-y-2">
          <img src={item.url} alt="" className="max-h-72 rounded-lg object-contain" />
          {item.caption && <div className="text-sm text-muted-foreground">{item.caption}</div>}
        </div>
      )
    case 'promotion':
      return (
        <div className="flex gap-4">
          {item.photoUrl && <img src={item.photoUrl} alt="" className="size-24 shrink-0 rounded-lg object-cover" />}
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{item.titleEn} · {item.titleAr}</div>
            <div className="text-muted-foreground">
              {item.discountType === 'PERCENTAGE' ? `${Number(item.discountValue)}% off` : `${Number(item.discountValue).toLocaleString()} IQD off`}
            </div>
            {(item.descriptionEn || item.descriptionAr) && (
              <div className="text-muted-foreground">{item.descriptionEn} {item.descriptionEn && item.descriptionAr && '·'} {item.descriptionAr}</div>
            )}
          </div>
        </div>
      )
    case 'event':
      return (
        <div className="flex gap-4">
          {item.photoUrl && <img src={item.photoUrl} alt="" className="size-24 shrink-0 rounded-lg object-cover" />}
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{item.titleEn} · {item.titleAr}</div>
            {(item.descriptionEn || item.descriptionAr) && (
              <div className="text-muted-foreground">{item.descriptionEn} {item.descriptionEn && item.descriptionAr && '·'} {item.descriptionAr}</div>
            )}
          </div>
        </div>
      )
    case 'blockedUpload':
    case 'adminSupportSession':
      return null
  }
}

export function RecentActivityPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

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
          what's changing without reviewing every restaurant one by one. Tap a row to see what was actually posted.
          Photos the AI reviewer blocked as inappropriate show up here too, highlighted in red — and so does every
          "Manage as this restaurant" support session, highlighted in the accent color, so it's always visible when
          a restaurant's account was accessed by an admin rather than the restaurant itself.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map((item) => {
          const Icon = icons[item.type]
          const isBlocked = item.type === 'blockedUpload'
          const isSupportSession = item.type === 'adminSupportSession'
          const expandable = isExpandable(item)
          const key = `${item.type}-${item.id}`
          const expanded = expandedKey === key
          return (
            <div key={key}>
              <div
                onClick={() => expandable && setExpandedKey(expanded ? null : key)}
                className={`flex items-start gap-3 px-4 py-3 ${isBlocked ? 'bg-destructive/5' : ''} ${isSupportSession ? 'bg-primary/5' : ''} ${expandable ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
              >
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                    isBlocked ? 'bg-destructive/15 text-destructive' : isSupportSession ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
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
                    <span className={isBlocked ? 'text-destructive' : isSupportSession ? 'text-primary' : undefined}>{describe(item)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
                {expandable && (
                  <div className="mt-1 shrink-0 text-muted-foreground">
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </div>
                )}
              </div>
              {expanded && (
                <div className="border-t border-border bg-secondary/30 px-4 py-4">
                  <Detail item={item} />
                </div>
              )}
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
