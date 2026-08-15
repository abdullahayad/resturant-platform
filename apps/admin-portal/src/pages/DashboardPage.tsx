import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '@/components/StatCard'
import { api, UnauthorizedError, type PlatformStats } from '@/lib/api'

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .platformStats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Aggregate stats across all restaurants.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Partners" value={stats ? String(stats.totalPartners) : '—'} trend="all-time" />
        <StatCard label="Active" value={stats ? String(stats.activeCount) : '—'} trend="currently live" />
        <StatCard label="Inactive" value={stats ? String(stats.inactiveCount) : '—'} trend="suspended" />
        <StatCard label="Pending Approvals" value={stats ? String(stats.pendingApprovals) : '—'} trend="awaiting review" />
        <StatCard label="Total Reviews" value={stats ? String(stats.totalReviews) : '—'} trend="across all restaurants" />
        <StatCard label="Flagged Content" value={stats ? String(stats.flaggedReviews) : '—'} trend="needs moderation" />
      </div>
    </div>
  )
}
