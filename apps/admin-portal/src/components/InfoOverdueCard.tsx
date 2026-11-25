import { useEffect, useState } from 'react'
import { api, type InfoOverdueItem } from '@/lib/api'

// Live restaurants that haven't confirmed their info for 30+ days. They
// get a card and a push in the partner app; call the ones that stay here.
export function InfoOverdueCard() {
  const [items, setItems] = useState<InfoOverdueItem[]>([])
  useEffect(() => {
    api.infoOverdue().then(setItems).catch(() => {})
  }, [])
  if (!items.length) return null
  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Info not confirmed for 30+ days ({items.length})
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2">
            <span>
              {r.nameEn} / {r.nameAr}
            </span>
            <span className="text-muted-foreground">
              {r.phone} · {r.days} days{r.everConfirmed ? '' : ' · never confirmed'}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
