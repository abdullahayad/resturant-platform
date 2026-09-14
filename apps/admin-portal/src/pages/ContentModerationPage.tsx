import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type ModerationStatus } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

type ContentType = 'dish' | 'photo' | 'event'

interface FeedItem {
  id: string
  contentType: ContentType
  title: string
  subtitle: string
  imageUrl: string | null
  moderationStatus: ModerationStatus
  createdAt: string
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

const statusFilters: { key: ModerationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FLAGGED', label: 'Flagged' },
  { key: 'VISIBLE', label: 'Visible' },
  { key: 'HIDDEN', label: 'Hidden' },
]

const typeFilters: { key: ContentType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Types' },
  { key: 'dish', label: 'Dishes' },
  { key: 'photo', label: 'Photos' },
  { key: 'event', label: 'Events' },
]

const statusTones: Record<ModerationStatus, StatusPillTone> = {
  VISIBLE: 'success',
  FLAGGED: 'primary',
  HIDDEN: 'destructive',
}

export function ContentModerationPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'ALL'>('FLAGGED')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'ALL'>('ALL')
  const [items, setItems] = useState<FeedItem[]>([])
  // This feed merges 3 independently-paginated sources (dishes/photos/
  // events), each fetched at the same shared `page` and up to PAGE_SIZE
  // items. `total` is the largest of the 3 sources' totals, so the pager
  // keeps advancing until every source is exhausted — the type filter below
  // only narrows what's displayed from whatever page is currently loaded,
  // it doesn't change how many pages there are.
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    const status = statusFilter === 'ALL' ? undefined : statusFilter
    Promise.all([
      api.moderatableDishes(status, page),
      api.moderatableGalleryPhotos(status, page),
      api.moderatableEvents(status, page),
    ])
      .then(([dishesRes, photosRes, eventsRes]) => {
        const dishes = dishesRes.items
        const photos = photosRes.items
        const events = eventsRes.items
        const merged: FeedItem[] = [
          ...dishes.map((d) => ({
            id: d.id,
            contentType: 'dish' as const,
            title: `${d.nameEn} · ${d.nameAr}`,
            subtitle: `${d.restaurant.nameEn} · ${d.restaurant.codeNumber}`,
            imageUrl: d.photoUrl,
            moderationStatus: d.moderationStatus,
            createdAt: d.createdAt,
            restaurant: d.restaurant,
          })),
          ...photos.map((p) => ({
            id: p.id,
            contentType: 'photo' as const,
            title: p.caption ?? p.album,
            subtitle: `${p.restaurant.nameEn} · ${p.restaurant.codeNumber}`,
            imageUrl: p.url,
            moderationStatus: p.moderationStatus,
            createdAt: p.createdAt,
            restaurant: p.restaurant,
          })),
          ...events.map((e) => ({
            id: e.id,
            contentType: 'event' as const,
            title: `${e.titleEn} · ${e.titleAr}`,
            subtitle: `${e.restaurant.nameEn} · ${e.restaurant.codeNumber}`,
            imageUrl: e.photoUrl,
            moderationStatus: e.moderationStatus,
            createdAt: e.createdAt,
            restaurant: e.restaurant,
          })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setItems(merged)
        setTotal(Math.max(dishesRes.total, photosRes.total, eventsRes.total))
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter, page])

  const moderate = async (item: FeedItem, status: ModerationStatus) => {
    setBusyId(item.id)
    try {
      if (item.contentType === 'dish') await api.moderateDish(item.id, status)
      else if (item.contentType === 'photo') await api.moderateGalleryPhoto(item.id, status)
      else await api.moderateEvent(item.id, status)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const visibleItems = typeFilter === 'ALL' ? items : items.filter((i) => i.contentType === typeFilter)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Content Moderation</h1>
        <p className="text-sm text-muted-foreground">
          Hide or restore dishes, photos, and events across every restaurant after the fact.
        </p>
      </div>

      <FilterTabs
        options={statusFilters}
        active={statusFilter}
        onChange={(v) => {
          setStatusFilter(v)
          setPage(1)
        }}
      />

      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              'rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground',
              typeFilter === f.key && 'border-primary text-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {visibleItems.map((item) => (
          <div key={`${item.contentType}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg bg-secondary" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{item.title}</span>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {item.contentType}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{item.subtitle}</div>
            </div>
            <StatusPill className="shrink-0" label={item.moderationStatus} tone={statusTones[item.moderationStatus]} />
            <div className="flex shrink-0 gap-2">
              {item.moderationStatus !== 'HIDDEN' && (
                <button
                  disabled={busyId === item.id}
                  onClick={() => moderate(item, 'HIDDEN')}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                >
                  Hide
                </button>
              )}
              {item.moderationStatus !== 'VISIBLE' && (
                <button
                  disabled={busyId === item.id}
                  onClick={() => moderate(item, 'VISIBLE')}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && visibleItems.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No content in this filter.
          </div>
        )}
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
