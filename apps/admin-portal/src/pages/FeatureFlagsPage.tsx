import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type FeatureFlagItem,
  type Province,
  type RestaurantListItem,
} from '@/lib/api'
import { Switch } from '@/components/Switch'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

export function FeatureFlagsPage() {
  const navigate = useNavigate()
  const [flags, setFlags] = useState<FeatureFlagItem[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [newProvinceId, setNewProvinceId] = useState('')
  const [newDistrictId, setNewDistrictId] = useState('')
  const [newRestaurantId, setNewRestaurantId] = useState('')

  const allDistricts = useMemo(
    () =>
      provinces.flatMap((p) =>
        p.districts.map((d) => ({ id: d.id, provinceId: p.id, label: `${d.nameEn} (${p.nameEn})` })),
      ),
    [provinces],
  )

  // Picking a city above narrows both pickers below it to that city only —
  // makes it easy to find the right district/restaurant in a long list
  // instead of scrolling every district/restaurant on the platform.
  const districts = useMemo(
    () => (newProvinceId ? allDistricts.filter((d) => d.provinceId === newProvinceId) : allDistricts),
    [allDistricts, newProvinceId],
  )
  // Picking a district narrows the restaurant list further, down to just
  // that district — takes priority over the city filter since it's more
  // specific (a district always belongs to exactly one city already).
  const filteredRestaurants = useMemo(() => {
    if (newDistrictId) return restaurants.filter((r) => r.district?.id === newDistrictId)
    if (newProvinceId) return restaurants.filter((r) => r.province?.id === newProvinceId)
    return restaurants
  }, [restaurants, newProvinceId, newDistrictId])

  const selectProvinceFilter = (id: string) => {
    setNewProvinceId(id)
    // Clear any selection that would now be hidden by the narrower list.
    setNewDistrictId('')
    setNewRestaurantId('')
  }

  const selectDistrictFilter = (id: string) => {
    setNewDistrictId(id)
    setNewRestaurantId('')
  }

  const load = () => {
    setLoading(true)
    api
      .featureFlags()
      .then(setFlags)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  useEffect(() => {
    api.provinces().then(setProvinces).catch(() => {})
    api.restaurantsPicker('APPROVED').then(setRestaurants).catch(() => {})
  }, [])

  const toggleDefault = async (flag: FeatureFlagItem) => {
    setBusyId(flag.id)
    try {
      await api.updateFeatureFlagDefault(flag.id, !flag.defaultEnabled)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const addProvinceOverride = async (flagId: string) => {
    if (!newProvinceId) return
    setBusyId(flagId)
    try {
      await api.setFeatureFlagOverride(flagId, { provinceId: newProvinceId, enabled: true })
      setNewProvinceId('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const addDistrictOverride = async (flagId: string) => {
    if (!newDistrictId) return
    setBusyId(flagId)
    try {
      await api.setFeatureFlagOverride(flagId, { districtId: newDistrictId, enabled: true })
      setNewDistrictId('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const addRestaurantOverride = async (flagId: string) => {
    if (!newRestaurantId) return
    setBusyId(flagId)
    try {
      await api.setFeatureFlagOverride(flagId, { restaurantId: newRestaurantId, enabled: true })
      setNewRestaurantId('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const toggleOverride = async (flagId: string, override: FeatureFlagItem['overrides'][number]) => {
    setBusyId(override.id)
    try {
      await api.setFeatureFlagOverride(flagId, {
        restaurantId: override.restaurant?.id,
        districtId: override.district?.id,
        provinceId: override.province?.id,
        enabled: !override.enabled,
      })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const removeOverride = async (overrideId: string) => {
    setBusyId(overrideId)
    try {
      await api.removeFeatureFlagOverride(overrideId)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          Control which sidebar sections restaurants can see — turn on a new feature for a handful of
          restaurants, a district, or a whole city first, before opening it up to everyone. Sections
          still off by default are listed first.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {flags.map((flag) => {
          const provinceOverrides = flag.overrides.filter((o) => o.province)
          const districtOverrides = flag.overrides.filter((o) => o.district)
          const restaurantOverrides = flag.overrides.filter((o) => o.restaurant)
          const isExpanded = expandedId === flag.id

          return (
            <div key={flag.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{flag.labelEn}</div>
                  <div className="font-mono text-xs text-muted-foreground">{flag.key}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={flag.defaultEnabled}
                    disabled={busyId === flag.id}
                    onChange={() => toggleDefault(flag)}
                    label={flag.defaultEnabled ? 'On for everyone by default' : 'Off by default'}
                  />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-primary">
                      Province overrides ({provinceOverrides.length})
                    </div>
                    <div className="space-y-2">
                      {provinceOverrides.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
                          <span className="text-sm">{o.province?.nameEn}</span>
                          <div className="flex items-center gap-2">
                            <Switch checked={o.enabled} disabled={busyId === o.id} onChange={() => toggleOverride(flag.id, o)} />
                            <button onClick={() => removeOverride(o.id)} disabled={busyId === o.id} className="text-muted-foreground disabled:opacity-50">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {provinceOverrides.length === 0 && (
                        <p className="text-sm text-muted-foreground">No province overrides.</p>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={newProvinceId}
                        onChange={(e) => selectProvinceFilter(e.target.value)}
                        className="min-w-[200px] rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Select a province…</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>{p.nameEn}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addProvinceOverride(flag.id)}
                        disabled={!newProvinceId || busyId === flag.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {newProvinceId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        District and restaurant lists below are narrowed to this city.{' '}
                        <button onClick={() => selectProvinceFilter('')} className="underline">Clear</button>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-primary">
                      District overrides ({districtOverrides.length})
                    </div>
                    <div className="space-y-2">
                      {districtOverrides.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
                          <span className="text-sm">{o.district?.nameEn} ({o.district?.province.nameEn})</span>
                          <div className="flex items-center gap-2">
                            <Switch checked={o.enabled} disabled={busyId === o.id} onChange={() => toggleOverride(flag.id, o)} />
                            <button onClick={() => removeOverride(o.id)} disabled={busyId === o.id} className="text-muted-foreground disabled:opacity-50">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {districtOverrides.length === 0 && (
                        <p className="text-sm text-muted-foreground">No district overrides.</p>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={newDistrictId}
                        onChange={(e) => selectDistrictFilter(e.target.value)}
                        className="min-w-[240px] rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Select a district…</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addDistrictOverride(flag.id)}
                        disabled={!newDistrictId || busyId === flag.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {newDistrictId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Restaurant list below is narrowed to this district.{' '}
                        <button onClick={() => selectDistrictFilter('')} className="underline">Clear</button>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-primary">
                      Restaurant overrides ({restaurantOverrides.length})
                    </div>
                    <div className="space-y-2">
                      {restaurantOverrides.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
                          <span className="text-sm">{o.restaurant?.nameEn} · {o.restaurant?.codeNumber}</span>
                          <div className="flex items-center gap-2">
                            <Switch checked={o.enabled} disabled={busyId === o.id} onChange={() => toggleOverride(flag.id, o)} />
                            <button onClick={() => removeOverride(o.id)} disabled={busyId === o.id} className="text-muted-foreground disabled:opacity-50">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {restaurantOverrides.length === 0 && (
                        <p className="text-sm text-muted-foreground">No restaurant overrides.</p>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={newRestaurantId}
                        onChange={(e) => setNewRestaurantId(e.target.value)}
                        className="min-w-[240px] rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Select a restaurant…</option>
                        {filteredRestaurants.map((r) => (
                          <option key={r.id} value={r.id}>{r.nameEn} · {r.codeNumber}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addRestaurantOverride(flag.id)}
                        disabled={!newRestaurantId || busyId === flag.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!loading && flags.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No feature flags yet.
          </div>
        )}
      </div>
    </div>
  )
}
