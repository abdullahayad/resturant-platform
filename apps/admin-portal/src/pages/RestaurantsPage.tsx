import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type Chain,
  type MasterDataItemFull,
  type Province,
  type RestaurantDetail,
  type RestaurantListItem,
  type RestaurantStatus,
} from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { Switch } from '@/components/Switch'
import { FilterTabs } from '@/components/FilterTabs'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { Pager } from '@/components/Pager'
import { SupportSessionModal } from '@/components/SupportSessionModal'

const statusFilters: { key: RestaurantStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
]

const statusTones: Record<RestaurantStatus, StatusPillTone> = {
  PENDING_REVIEW: 'muted',
  APPROVED: 'success',
  REJECTED: 'destructive',
  SUSPENDED: 'destructive',
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
  const [chains, setChains] = useState<Chain[]>([])

  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RestaurantDetail | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [supportSessionFor, setSupportSessionFor] = useState<{ id: string; nameEn: string } | null>(null)

  useEffect(() => {
    api.provinces().then(setProvinces).catch(() => {})
    api.masterData('business-types').then(setBusinessTypes).catch(() => {})
    api.masterData('food-categories').then(setFoodCategories).catch(() => {})
    api.chains().then(setChains).catch(() => {})
  }, [])

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  // A new search term always starts back at page 1 — the other filters
  // reset page themselves in their own onChange handlers below, avoiding a
  // duplicate fetch that a shared "reset on any filter change" effect
  // would otherwise cause alongside this one.
  useEffect(() => setPage(1), [debouncedSearch])

  const currentFilters = () => ({
    status: filter === 'ALL' ? undefined : filter,
    provinceId: provinceId === ALL ? undefined : provinceId,
    districtId: districtId === ALL ? undefined : districtId,
    businessTypeId: businessTypeId === ALL ? undefined : businessTypeId,
    foodCategoryId: foodCategoryId === ALL ? undefined : foodCategoryId,
    search: debouncedSearch || undefined,
  })

  const load = () => {
    setLoading(true)
    api
      .restaurants({ ...currentFilters(), page })
      .then((res) => {
        setRestaurants(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, provinceId, districtId, businessTypeId, foodCategoryId, debouncedSearch, page])

  const selectedProvince = provinces.find((p) => p.id === provinceId)

  // Exports every restaurant matching the current filters, not just the
  // page on screen — walks every page at the API's page size since the
  // list itself is now paginated.
  const exportCsv = async () => {
    const filters = currentFilters()
    const all: RestaurantListItem[] = []
    for (let p = 1; ; p++) {
      const res = await api.restaurants({ ...filters, page: p })
      all.push(...res.items)
      if (all.length >= res.total || res.items.length === 0) break
    }
    downloadCsv(
      `restaurants-${new Date().toISOString().slice(0, 10)}.csv`,
      all.map((r) => ({
        codeNumber: r.codeNumber,
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        status: r.status,
        phone: r.phone,
        ownerEmail: r.ownerEmail,
        province: r.province?.nameEn ?? '',
        district: r.district?.nameEn ?? '',
        chain: r.chain?.nameEn ?? '',
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
        { key: 'chain', label: 'Chain' },
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

  const setChain = async (id: string, chainId: string | null) => {
    setBusyId(id)
    try {
      await api.setRestaurantChain(id, chainId)
      if (expandedId === id) setDetail(await api.restaurant(id))
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
          disabled={total === 0}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary disabled:opacity-50"
        >
          Export CSV ({total})
        </button>
      </div>

      <FilterTabs
        options={statusFilters}
        active={filter}
        onChange={(v) => {
          setFilter(v)
          setPage(1)
        }}
      />

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
            setPage(1)
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
          onChange={(e) => {
            setDistrictId(e.target.value)
            setPage(1)
          }}
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
          onChange={(e) => {
            setBusinessTypeId(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value={ALL}>All Business Types</option>
          {businessTypes.map((b) => (
            <option key={b.id} value={b.id}>{b.nameEn}</option>
          ))}
        </select>

        <select
          value={foodCategoryId}
          onChange={(e) => {
            setFoodCategoryId(e.target.value)
            setPage(1)
          }}
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
              setPage(1)
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Sr. No.</th>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">District</th>
              <th className="px-4 py-2 font-medium">Business Type</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r, i) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => toggleExpand(r.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-4 py-2 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.codeNumber}</td>
                  <td className="px-4 py-2 font-semibold">
                    {r.nameEn} <span className="font-normal text-muted-foreground">· {r.nameAr}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.province?.nameEn ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.district?.nameEn ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.businessTypes.length === 0
                      ? '—'
                      : r.businessTypes
                          .slice(0, 2)
                          .map((b) => b.businessType.nameEn)
                          .join(', ')}
                    {r.businessTypes.length > 2 && (
                      <span className="text-xs"> +{r.businessTypes.length - 2}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.phone}</td>
                  <td className="px-4 py-2">
                    <StatusPill label={r.status.replace('_', ' ')} tone={statusTones[r.status]} />
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
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
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
                      >
                        Reinstate
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr className="border-b border-border last:border-0 bg-secondary/30">
                    <td colSpan={9} className="px-4 py-4 text-sm">
                      {!detail ? (
                        <p className="text-muted-foreground">Loading…</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-muted-foreground">Owner email</div>
                            <div>{detail.ownerEmail}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Coordinates</div>
                            <div>
                              {detail.latitude != null && detail.longitude != null
                                ? `${detail.latitude}, ${detail.longitude}`
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Food Categories</div>
                            <div>{detail.foodCategories.map((f) => f.foodCategory.nameEn).join(', ') || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Facilities</div>
                            <div>{detail.facilities.map((f) => f.facility.nameEn).join(', ') || '—'}</div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <div className="mb-1 text-xs text-muted-foreground">Chain</div>
                            <select
                              value={detail.chain?.id ?? ''}
                              disabled={busyId === r.id}
                              onChange={(e) => setChain(r.id, e.target.value || null)}
                              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
                            >
                              <option value="">Not part of a chain</option>
                              {chains.map((c) => (
                                <option key={c.id} value={c.id}>{c.nameEn}</option>
                              ))}
                            </select>
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
                          <div onClick={(e) => e.stopPropagation()}>
                            <div className="mb-1 text-xs text-muted-foreground">Support</div>
                            <button
                              onClick={() => setSupportSessionFor({ id: r.id, nameEn: r.nameEn })}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
                            >
                              Manage as this restaurant
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!loading && restaurants.length === 0 && !error && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No restaurants match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />

      {supportSessionFor && (
        <SupportSessionModal
          restaurantId={supportSessionFor.id}
          restaurantName={supportSessionFor.nameEn}
          onClose={() => setSupportSessionFor(null)}
        />
      )}
    </div>
  )
}
