import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type MasterDataItemFull,
  type Province,
  type RestaurantDetail,
  type RestaurantListItem,
  type RestaurantStatus,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { downloadCsv } from '@/lib/csv'
import { Switch } from '@/components/Switch'

const statusFilters: { key: RestaurantStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
]

const statusStyles: Record<RestaurantStatus, string> = {
  PENDING_REVIEW: 'bg-secondary text-muted-foreground',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/15 text-destructive',
  SUSPENDED: 'bg-destructive/15 text-destructive',
}

const ALL = '__all__'

export function RestaurantsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RestaurantStatus | 'ALL'>('ALL')
  const [provinceId, setProvinceId] = useState(ALL)
  const [districtId, setDistrictId] = useState(ALL)
  const [businessTypeId, setBusinessTypeId] = useState(ALL)
  const [foodCategoryId, setFoodCategoryId] = useState(ALL)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [provinces, setProvinces] = useState<Province[]>([])
  const [businessTypes, setBusinessTypes] = useState<MasterDataItemFull[]>([])
  const [foodCategories, setFoodCategories] = useState<MasterDataItemFull[]>([])

  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RestaurantDetail | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    api.provinces().then(setProvinces).catch(() => {})
    api.masterData('business-types').then(setBusinessTypes).catch(() => {})
    api.masterData('food-categories').then(setFoodCategories).catch(() => {})
  }, [])

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = () => {
    setLoading(true)
    api
      .restaurants({
        status: filter === 'ALL' ? undefined : filter,
        provinceId: provinceId === ALL ? undefined : provinceId,
        districtId: districtId === ALL ? undefined : districtId,
        businessTypeId: businessTypeId === ALL ? undefined : businessTypeId,
        foodCategoryId: foodCategoryId === ALL ? undefined : foodCategoryId,
        search: debouncedSearch || undefined,
      })
      .then(setRestaurants)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, provinceId, districtId, businessTypeId, foodCategoryId, debouncedSearch])

  const selectedProvince = provinces.find((p) => p.id === provinceId)

  // Exports exactly what's currently on screen — respects whatever
  // status/city/category/search filters are applied at the time.
  const exportCsv = () => {
    downloadCsv(
      `restaurants-${new Date().toISOString().slice(0, 10)}.csv`,
      restaurants.map((r) => ({
        codeNumber: r.codeNumber,
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        status: r.status,
        phone: r.phone,
        ownerEmail: r.ownerEmail,
        province: r.province?.nameEn ?? '',
        district: r.district?.nameEn ?? '',
        statsVisible: r.statsVisible ? 'Yes' : 'No',
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt ?? '',
        rejectionReason: r.rejectionReason ?? '',
      })),
      [
        { key: 'codeNumber', label: 'Code' },
        { key: 'nameEn', label: 'Name (EN)' },
        { key: 'nameAr', label: 'Name (AR)' },
        { key: 'status', label: 'Status' },
        { key: 'phone', label: 'Phone' },
        { key: 'ownerEmail', label: 'Owner Email' },
        { key: 'province', label: 'Province' },
        { key: 'district', label: 'District' },
        { key: 'statsVisible', label: 'Stats Visible to Partner' },
        { key: 'createdAt', label: 'Registered At' },
        { key: 'reviewedAt', label: 'Reviewed At' },
        { key: 'rejectionReason', label: 'Rejection Reason' },
      ],
    )
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(id)
    setDetail(null)
    const full = await api.restaurant(id)
    setDetail(full)
  }

  const setActive = async (id: string, active: boolean) => {
    setBusyId(id)
    try {
      if (active) await api.approve(id)
      else await api.suspend(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const reinstate = async (id: string) => {
    setBusyId(id)
    try {
      await api.approve(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const toggleStatsVisible = async (id: string, statsVisible: boolean) => {
    setBusyId(id)
    try {
      await api.setStatsVisibility(id, statsVisible)
      load()
      if (expandedId === id) setDetail(await api.restaurant(id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            View any restaurant's full profile, and switch a live listing active or inactive.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={restaurants.length === 0}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary disabled:opacity-50"
        >
          Export CSV ({restaurants.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground',
              filter === f.key && 'bg-primary/10 text-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or owner email…"
          className="min-w-[260px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={provinceId}
          onChange={(e) => {
            setProvinceId(e.target.value)
            setDistrictId(ALL)
          }}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value={ALL}>All Cities</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.nameEn}</option>
          ))}
        </select>

        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          disabled={!selectedProvince}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
        >
          <option value={ALL}>All Districts</option>
          {selectedProvince?.districts.map((d) => (
            <option key={d.id} value={d.id}>{d.nameEn}</option>
          ))}
        </select>

        <select
          value={businessTypeId}
          onChange={(e) => setBusinessTypeId(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value={ALL}>All Business Types</option>
          {businessTypes.map((b) => (
            <option key={b.id} value={b.id}>{b.nameEn}</option>
          ))}
        </select>

        <select
          value={foodCategoryId}
          onChange={(e) => setFoodCategoryId(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value={ALL}>All Categories</option>
          {foodCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.nameEn}</option>
          ))}
        </select>

        {(provinceId !== ALL || districtId !== ALL || businessTypeId !== ALL || foodCategoryId !== ALL || search) && (
          <button
            onClick={() => {
              setProvinceId(ALL)
              setDistrictId(ALL)
              setBusinessTypeId(ALL)
              setFoodCategoryId(ALL)
              setSearch('')
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {restaurants.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <button onClick={() => toggleExpand(r.id)} className="text-left">
                <div className="font-semibold">
                  {r.nameEn} <span className="text-muted-foreground">· {r.nameAr}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.codeNumber} · {r.phone}
                  {r.province ? ` · ${r.province.nameEn}${r.district ? `, ${r.district.nameEn}` : ''}` : ''}
                </div>
              </button>
              <div className="flex items-center gap-3">
                <span className={cn('rounded-full px-2.5 py-1 text-xs', statusStyles[r.status])}>
                  {r.status.replace('_', ' ')}
                </span>
                {(r.status === 'APPROVED' || r.status === 'SUSPENDED') && (
                  <Switch
                    checked={r.status === 'APPROVED'}
                    disabled={busyId === r.id}
                    onChange={() => setActive(r.id, r.status !== 'APPROVED')}
                    label={r.status === 'APPROVED' ? 'Active' : 'Inactive'}
                  />
                )}
                {r.status === 'REJECTED' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => reinstate(r.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
                  >
                    Reinstate
                  </button>
                )}
              </div>
            </div>

            {expandedId === r.id && (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                {!detail ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Owner email</div>
                      <div>{detail.ownerEmail}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div>
                        {detail.province?.nameEn ?? '—'}
                        {detail.district ? `, ${detail.district.nameEn}` : ''}
                        {detail.latitude != null && detail.longitude != null
                          ? ` (${detail.latitude}, ${detail.longitude})`
                          : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Business Types</div>
                      <div>{detail.businessTypes.map((b) => b.businessType.nameEn).join(', ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Food Categories</div>
                      <div>{detail.foodCategories.map((f) => f.foodCategory.nameEn).join(', ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Facilities</div>
                      <div>{detail.facilities.map((f) => f.facility.nameEn).join(', ') || '—'}</div>
                    </div>
                    {detail.rejectionReason && (
                      <div>
                        <div className="text-xs text-muted-foreground">Rejection Reason</div>
                        <div>{detail.rejectionReason}</div>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">Overview Dashboard Numbers</div>
                      <Switch
                        checked={detail.statsVisible}
                        disabled={busyId === r.id}
                        onChange={() => toggleStatsVisible(r.id, !detail.statsVisible)}
                        label={detail.statsVisible ? 'Visible to partner' : 'Hidden from partner'}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && restaurants.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No restaurants match these filters.
          </div>
        )}
      </div>
    </div>
  )
}
