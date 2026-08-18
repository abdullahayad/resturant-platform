import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MasterDataList } from '@/components/MasterDataList'
import type { MasterDataKind } from '@/lib/api'

const tabs: { key: MasterDataKind; label: string; showIcon?: boolean }[] = [
  { key: 'business-types', label: 'Business Types' },
  { key: 'food-categories', label: 'Food Categories' },
  { key: 'menu-categories', label: 'Menu Categories' },
  { key: 'facilities', label: 'Facilities & Amenities', showIcon: true },
  { key: 'event-types', label: 'Event Types', showIcon: true },
]

export function MasterDataPage() {
  const [active, setActive] = useState<MasterDataKind>('business-types')
  const activeTab = tabs.find((t) => t.key === active)!

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Master Data</h1>
        <p className="text-sm text-muted-foreground">
          Every list the partner app reads from — CRUD lives here, not in a migration.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground',
              active === tab.key && 'bg-primary/10 text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MasterDataList key={activeTab.key} kind={activeTab.key} showIcon={activeTab.showIcon} />
    </div>
  )
}
