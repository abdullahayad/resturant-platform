import { useState } from 'react'
import { MasterDataList } from '@/components/MasterDataList'
import { FilterTabs } from '@/components/FilterTabs'
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

      <FilterTabs options={tabs} active={active} onChange={setActive} />

      <MasterDataList key={activeTab.key} kind={activeTab.key} showIcon={activeTab.showIcon} />
    </div>
  )
}
