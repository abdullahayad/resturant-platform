import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store,
  BookOpen,
  Images,
  Percent,
  Sparkles,
  ChefHat,
  CalendarClock,
  Star,
  CalendarCheck,
  Inbox,
  Settings,
  ShieldAlert,
  KeyRound,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { api, UnauthorizedError, SECTION_LABELS, type AdminActivityItem, type AdminActivitySection } from '@/lib/api'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

// Same icon choices the partner-app's own sidebar uses for each section
// (src/lib/nav.ts) - an admin scanning this page and a restaurant owner
// scanning their own nav see the same icon for the same section.
const SECTION_ICONS: Record<AdminActivitySection, LucideIcon> = {
  profile: Store,
  menu: BookOpen,
  gallery: Images,
  promotions: Percent,
  advertising: Sparkles,
  chefManagement: ChefHat,
  chefTable: CalendarClock,
  reviews: Star,
  reservations: CalendarCheck,
  announcements: Inbox,
  settings: Settings,
  blockedUpload: ShieldAlert,
  adminSupportSession: KeyRound,
}

const FILTER_OPTIONS: (AdminActivitySection | 'ALL')[] = [
  'ALL',
  'profile',
  'menu',
  'gallery',
  'promotions',
  'advertising',
  'chefManagement',
  'chefTable',
  'reviews',
  'reservations',
  'announcements',
  'settings',
  'blockedUpload',
  'adminSupportSession',
]

function describe(item: AdminActivityItem): string {
  switch (item.type) {
    case 'restaurantActivity':
      return item.summary
    case 'blockedUpload':
      return `tried to upload a photo the AI reviewer flagged as inappropriate (${item.originalName}) — it was blocked, never stored`
    case 'adminSupportSession':
      return `was accessed by ${item.adminName} via "Manage as this restaurant"`
  }
}

function actorLabel(item: AdminActivityItem): string | null {
  if (item.type !== 'restaurantActivity') return null
  if (item.actor.kind === 'staff') return `Staff: ${item.actor.name}`
  if (item.actor.kind === 'admin') return `Admin: ${item.actor.name} (support session)`
  return null
}

// Pure create/delete/status-flip entries have nothing beyond their summary
// to show - only an edit with field-level changes, or the two admin-side
// exceptions' own detail (which have none either), is worth expanding.
function isExpandable(item: AdminActivityItem): boolean {
  return item.type === 'restaurantActivity' && !!item.changes && item.changes.length > 0
}

function Detail({ item }: { item: AdminActivityItem }) {
  if (item.type !== 'restaurantActivity' || !item.changes) return null
  return (
    <div className="space-y-1.5 text-sm">
      {item.changes.map((c, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{c.field}:</span>
          <span className="text-muted-foreground">{String(c.from ?? '—')}</span>
          <span className="text-muted-foreground">→</span>
          <span>{String(c.to ?? '—')}</span>
        </div>
      ))}
    </div>
  )
}

export function RecentActivityPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [section, setSection] = useState<AdminActivitySection | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .adminActivity(page, section === 'ALL' ? undefined : section)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }, [page, section, navigate])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Recent Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every change a restaurant makes to its own account, grouped by section — pick a section below to see which
          restaurants changed what, newest first. Blocked Uploads and Admin Access aren't restaurant actions: the
          first is a photo the AI reviewer stopped, the second is an admin accessing a restaurant's account directly
          via "Manage as this restaurant."
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setSection(opt)
              setPage(1)
            }}
            className={
              section === opt
                ? 'rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary'
                : 'rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground'
            }
          >
            {opt === 'ALL' ? 'All' : SECTION_LABELS[opt]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map((item) => {
          const Icon = item.type === 'restaurantActivity' ? SECTION_ICONS[item.section] : SECTION_ICONS[item.type]
          const isBlocked = item.type === 'blockedUpload'
          const isSupportSession = item.type === 'adminSupportSession'
          const expandable = isExpandable(item)
          const key = `${item.type}-${item.id}`
          const expanded = expandedKey === key
          const actor = actorLabel(item)
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {actor && <span>· {actor}</span>}
                  </div>
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
