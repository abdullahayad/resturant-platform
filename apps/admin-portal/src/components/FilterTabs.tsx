import { cn } from '@/lib/utils'

// The row of filter tabs repeated across every list page (Reviews,
// Promotions, Approvals, Restaurants, Content Moderation) — previously each
// page redefined its own copy of this exact markup.
export function FilterTabs<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground',
            active === o.key && 'bg-primary/10 text-primary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
