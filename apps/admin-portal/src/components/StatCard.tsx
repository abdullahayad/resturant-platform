import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  trend?: string
  /** 'up'/'down' render a colored trend arrow (only use for an actual computed delta); 'neutral' (default) is a plain caption. */
  tone?: 'up' | 'down' | 'neutral'
  icon?: LucideIcon
  className?: string
}

export function StatCard({ label, value, trend, tone = 'neutral', icon: Icon, className }: StatCardProps) {
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
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-xs',
            tone === 'up' && 'text-success',
            tone === 'down' && 'text-destructive',
            tone === 'neutral' && 'text-muted-foreground',
          )}
        >
          {tone === 'up' && <TrendingUp className="size-3.5" />}
          {tone === 'down' && <TrendingDown className="size-3.5" />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  )
}
