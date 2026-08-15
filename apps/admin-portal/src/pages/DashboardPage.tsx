import { StatCard } from '@/components/StatCard'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate stats across all restaurants. Wired to real data once the approvals
          and reviews endpoints land.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Partners" value="—" trend="vs last week" />
        <StatCard label="Pending Approvals" value="—" trend="awaiting review" />
        <StatCard label="Total Reviews" value="—" trend="vs last week" />
        <StatCard label="Flagged Content" value="—" trend="needs moderation" />
      </div>
    </div>
  )
}
