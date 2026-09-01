import { cn } from '@/lib/utils'

export type StatusPillTone = 'muted' | 'primary' | 'success' | 'destructive'

const toneStyles: Record<StatusPillTone, string> = {
  muted: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  destructive: 'bg-destructive/15 text-destructive',
}

// The small rounded status badge repeated across every moderation/approval
// page (Reviews, Promotions, Approvals, Content Moderation, Publish Review)
// — previously each page redefined its own copy of this exact markup.
export function StatusPill({ label, tone, className }: { label: string; tone: StatusPillTone; className?: string }) {
  return <span className={cn('rounded-full px-2.5 py-1 text-xs', toneStyles[tone], className)}>{label}</span>
}
