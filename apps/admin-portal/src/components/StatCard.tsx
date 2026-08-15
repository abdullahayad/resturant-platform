import type { LucideIcon } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  trend?: string
  icon?: LucideIcon
  className?: string
}

export function StatCard({ label, value, trend, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {trend && (
        <div className="mt-1 flex items-center gap-1 text-xs text-success">
          <TrendingUp className="size-3.5" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  )
}
