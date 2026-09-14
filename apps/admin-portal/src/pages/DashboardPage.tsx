import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  MessageSquareWarning,
  Percent,
  Sparkles,
  Store,
  CircleCheck,
  CircleOff,
  MessageSquareText,
  Flag,
} from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { StatusPill } from '@/components/StatusPill'
import { api, UnauthorizedError, type PlatformStats } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AttentionItem {
  label: string
  count: number
  path: string
  icon: typeof ClipboardCheck
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [promotionsPending, setPromotionsPending] = useState<number | null>(null)
  const [featuredPending, setFeaturedPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .platformStats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
    api.promotions('PENDING').then((res) => setPromotionsPending(res.total)).catch(() => {})
    api.featured('PENDING').then((list) => setFeaturedPending(list.length)).catch(() => {})
  }, [])

  const attentionItems: AttentionItem[] = [
    { label: 'Restaurant approvals', count: stats?.pendingApprovals ?? 0, path: '/approvals', icon: ClipboardCheck },
    { label: 'Flagged reviews', count: stats?.flaggedReviews ?? 0, path: '/reviews', icon: MessageSquareWarning },
    { label: 'Promotions pending', count: promotionsPending ?? 0, path: '/promotions', icon: Percent },
    { label: 'Featured requests pending', count: featuredPending ?? 0, path: '/advertising', icon: Sparkles },
  ]
  const totalPending = attentionItems.reduce((sum, i) => sum + i.count, 0)
  const loaded = stats !== null && promotionsPending !== null && featuredPending !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Aggregate stats across all restaurants.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Partners" value={stats ? String(stats.totalPartners) : '—'} trend="all-time" icon={Store} />
        <StatCard label="Active" value={stats ? String(stats.activeCount) : '—'} trend="currently live" icon={CircleCheck} />
        <StatCard label="Inactive" value={stats ? String(stats.inactiveCount) : '—'} trend="suspended" icon={CircleOff} />
        <StatCard label="Pending Approvals" value={stats ? String(stats.pendingApprovals) : '—'} trend="awaiting review" icon={ClipboardCheck} />
        <StatCard label="Total Reviews" value={stats ? String(stats.totalReviews) : '—'} trend="across all restaurants" icon={MessageSquareText} />
        <StatCard label="Flagged Content" value={stats ? String(stats.flaggedReviews) : '—'} trend="needs moderation" icon={Flag} />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Needs Your Attention</h2>
        <p className="text-sm text-muted-foreground">Everything currently waiting on a decision, in one place.</p>
      </div>

      {loaded && totalPending === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing pending — you're all caught up.
        </div>
      ) : (
        <div className="space-y-2">
          {attentionItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={item.count === 0}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors',
                item.count > 0 ? 'hover:bg-secondary' : 'opacity-50',
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill
                  className="font-semibold"
                  label={loaded ? String(item.count) : '—'}
                  tone={item.count > 0 ? 'primary' : 'muted'}
                />
                {item.count > 0 && <span className="text-xs text-muted-foreground">Review →</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
