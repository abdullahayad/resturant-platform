import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type District, type Province, type Zone } from '@/lib/api'

const emptyProvinceForm = { nameEn: '', nameAr: '', code: '' }
const emptyZoneForm = { nameEn: '', nameAr: '' }

export function LocationsPage() {
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newProvince, setNewProvince] = useState(emptyProvinceForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newDistrict, setNewDistrict] = useState(emptyProvinceForm)
  const [newZone, setNewZone] = useState(emptyZoneForm)
  // A province can have several zones open at once (e.g. adding districts
  // to both Rusafa and Karkh in the same visit) - expanding one never
  // closes another, and nothing auto-collapses after an add.
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<string>>(new Set())

  const load = () => {
    setLoading(true)
    api
      .provinces()
      // The admin portal (static site) and backend API deploy as separate
      // Render services, so right after a push there's a window where this
      // new code can hit the still-deploying old API, which has no `zones`
      // field at all - defaulting missing arrays here avoids a hard crash
      // during that race instead of relying on both deploys landing at once.
      .then((data) =>
        setProvinces(
          data.map((p) => ({
            ...p,
            districts: p.districts ?? [],
            zones: (p.zones ?? []).map((z) => ({ ...z, districts: z.districts ?? [] })),
          })),
        ),
      )
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Every write below funnels failures through here instead of letting them
  // go unhandled - a rejected promise from a plain (non-try/catch) async
  // handler used to fail completely silently, giving no feedback at all
  // (e.g. a MODERATOR blocked by the backend from deleting a district would
  // just see nothing happen).
  const handleWriteError = (err: unknown) => {
    if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
    else setError(err instanceof Error ? err.message : 'Something went wrong - please try again.')
  }

  const addProvince = async () => {
    if (!newProvince.nameEn.trim() || !newProvince.nameAr.trim() || newProvince.code.trim().length !== 4) return
    try {
      setError(null)
      const created = await api.createProvince(newProvince)
      setProvinces((prev) => [...prev, { ...created, districts: [], zones: [] }])
      setNewProvince(emptyProvinceForm)
    } catch (err) {
      handleWriteError(err)
    }
  }

  const toggleProvinceActive = async (p: Province) => {
    try {
      setError(null)
      const updated = await api.updateProvince(p.id, { isActive: !p.isActive })
      setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)))
    } catch (err) {
      handleWriteError(err)
    }
  }

  const saveProvinceCode = async (p: Province, code: string) => {
    if (code === p.code || code.trim().length !== 4) return
    try {
      setError(null)
      const updated = await api.updateProvince(p.id, { code })
      setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)))
    } catch (err) {
      handleWriteError(err)
    }
  }

  const saveDistrictCode = async (provinceId: string, d: District, code: string) => {
    if (code === d.code || code.trim().length !== 4) return
    try {
      setError(null)
      const updated = await api.updateDistrict(d.id, { code })
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === provinceId ? { ...p, districts: p.districts.map((x) => (x.id === d.id ? updated : x)) } : p,
        ),
      )
    } catch (err) {
      handleWriteError(err)
    }
  }

  const deleteProvince = async (id: string) => {
    try {
      setError(null)
      await api.deleteProvince(id)
      setProvinces((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      handleWriteError(err)
    }
  }

  const addDistrict = async (provinceId: string) => {
    if (!newDistrict.nameEn.trim() || !newDistrict.nameAr.trim() || newDistrict.code.trim().length !== 4) return
    try {
      setError(null)
      const created = await api.createDistrict(provinceId, newDistrict)
      setProvinces((prev) =>
        prev.map((p) => (p.id === provinceId ? { ...p, districts: [...p.districts, created] } : p)),
      )
      setNewDistrict(emptyProvinceForm)
    } catch (err) {
      handleWriteError(err)
    }
  }

  const toggleDistrictActive = async (provinceId: string, d: District) => {
    try {
      setError(null)
      const updated = await api.updateDistrict(d.id, { isActive: !d.isActive })
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === provinceId ? { ...p, districts: p.districts.map((x) => (x.id === d.id ? updated : x)) } : p,
        ),
      )
    } catch (err) {
      handleWriteError(err)
    }
  }

  const deleteDistrict = async (provinceId: string, districtId: string) => {
    try {
      setError(null)
      await api.deleteDistrict(districtId)
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === provinceId ? { ...p, districts: p.districts.filter((d) => d.id !== districtId) } : p,
        ),
      )
    } catch (err) {
      handleWriteError(err)
    }
  }

  // ── zones (Baghdad's Rusafa/Karkh grouping layer, available for any
  // province that grows large enough to want it) ─────────────────────────
  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return next
    })
  }

  const addZone = async (provinceId: string) => {
    if (!newZone.nameEn.trim() || !newZone.nameAr.trim()) return
    try {
      setError(null)
      const created = await api.createZone(provinceId, newZone)
      setProvinces((prev) =>
        prev.map((p) => (p.id === provinceId ? { ...p, zones: [...p.zones, { ...created, districts: [] }] } : p)),
      )
      setNewZone(emptyZoneForm)
      setExpandedZoneIds((prev) => new Set(prev).add(created.id))
    } catch (err) {
      handleWriteError(err)
    }
  }

  const toggleZoneActive = async (provinceId: string, zone: Zone) => {
    try {
      setError(null)
      const updated = await api.updateZone(zone.id, { isActive: !zone.isActive })
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === provinceId
            ? { ...p, zones: p.zones.map((z) => (z.id === zone.id ? { ...z, ...updated } : z)) }
            : p,
        ),
      )
    } catch (err) {
      handleWriteError(err)
    }
  }

  const deleteZone = async (provinceId: string, zoneId: string) => {
    try {
      setError(null)
      await api.deleteZone(zoneId)
      setProvinces((prev) =>
        prev.map((p) => (p.id === provinceId ? { ...p, zones: p.zones.filter((z) => z.id !== zoneId) } : p)),
      )
    } catch (err) {
      handleWriteError(err)
    }
  }

  const addDistrictToZone = async (
    provinceId: string,
    zoneId: string,
    form: { nameEn: string; nameAr: string; code: string },
  ) => {
    const created = await api.createDistrictForZone(zoneId, form)
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId
          ? { ...p, zones: p.zones.map((z) => (z.id === zoneId ? { ...z, districts: [...z.districts, created] } : z)) }
          : p,
      ),
    )
  }

  const toggleZoneDistrictActive = async (provinceId: string, zoneId: string, d: District) => {
    const updated = await api.updateDistrict(d.id, { isActive: !d.isActive })
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId
          ? {
              ...p,
              zones: p.zones.map((z) =>
                z.id === zoneId ? { ...z, districts: z.districts.map((x) => (x.id === d.id ? updated : x)) } : z,
              ),
            }
          : p,
      ),
    )
  }

  const saveZoneDistrictCode = async (provinceId: string, zoneId: string, d: District, code: string) => {
    if (code === d.code || code.trim().length !== 4) return
    const updated = await api.updateDistrict(d.id, { code })
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId
          ? {
              ...p,
              zones: p.zones.map((z) =>
                z.id === zoneId ? { ...z, districts: z.districts.map((x) => (x.id === d.id ? updated : x)) } : z,
              ),
            }
          : p,
      ),
    )
  }

  const deleteZoneDistrict = async (provinceId: string, zoneId: string, districtId: string) => {
    await api.deleteDistrict(districtId)
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId
          ? {
              ...p,
              zones: p.zones.map((z) =>
                z.id === zoneId ? { ...z, districts: z.districts.filter((d) => d.id !== districtId) } : z,
              ),
            }
          : p,
      ),
    )
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Cities & Districts</h1>
        <p className="text-sm text-muted-foreground">
          Iraqi provinces and their nested districts, used by the partner app's location picker.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold text-primary">Add Province</div>
        <div className="flex flex-wrap gap-3">
          <input
            value={newProvince.nameEn}
            onChange={(e) => setNewProvince((f) => ({ ...f, nameEn: e.target.value }))}
            placeholder="Name (English)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={newProvince.nameAr}
            onChange={(e) => setNewProvince((f) => ({ ...f, nameAr: e.target.value }))}
            placeholder="Name (Arabic)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={newProvince.code}
            onChange={(e) => setNewProvince((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 4) }))}
            placeholder="Code"
            maxLength={4}
            title="Four-letter code used in restaurant codes, e.g. BAGH for Baghdad"
            className="w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-center font-mono text-sm uppercase outline-none focus:border-primary"
          />
          <button onClick={addProvince} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Add Province
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {provinces.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="flex items-center gap-2 text-left font-semibold"
              >
                <span>{expandedId === p.id ? '▾' : '▸'}</span>
                {p.nameEn} · {p.nameAr}
                <span className="text-xs font-normal text-muted-foreground">
                  ({p.zones.length > 0
                    ? `${p.zones.length} zones, ${p.zones.reduce((sum, z) => sum + z.districts.length, 0)} districts`
                    : `${p.districts.length} districts`})
                </span>
              </button>
              <div className="flex items-center gap-3">
                <input
                  key={p.code}
                  defaultValue={p.code}
                  onBlur={(e) => saveProvinceCode(p, e.target.value.toUpperCase())}
                  maxLength={4}
                  title="Four-letter code used in restaurant codes"
                  className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center font-mono text-xs uppercase outline-none focus:border-primary"
                />
                <button
                  onClick={() => toggleProvinceActive(p)}
                  className={
                    p.isActive
                      ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs text-success'
                      : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground'
                  }
                >
                  {p.isActive ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteProvince(p.id)} className="text-sm text-destructive">
                  Delete
                </button>
              </div>
            </div>

            {expandedId === p.id && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                {/* Zones - a province with none skips straight to the flat
                    district list below, exactly as it always worked. */}
                {p.zones.map((z) => (
                  <div key={z.id} className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleZoneExpanded(z.id)}
                        className="flex items-center gap-2 text-left text-sm font-semibold"
                      >
                        <span>{expandedZoneIds.has(z.id) ? '▾' : '▸'}</span>
                        {z.nameEn} · {z.nameAr}
                        <span className="text-xs font-normal text-muted-foreground">({z.districts.length} districts)</span>
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleZoneActive(p.id, z)}
                          className={
                            z.isActive
                              ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs text-success'
                              : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground'
                          }
                        >
                          {z.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => deleteZone(p.id, z.id)} className="text-xs text-destructive">
                          Delete
                        </button>
                      </div>
                    </div>

                    {expandedZoneIds.has(z.id) && (
                      <ZoneDistricts
                        provinceId={p.id}
                        zone={z}
                        onAdd={addDistrictToZone}
                        onToggleActive={toggleZoneDistrictActive}
                        onSaveCode={saveZoneDistrictCode}
                        onDelete={deleteZoneDistrict}
                        onError={handleWriteError}
                      />
                    )}
                  </div>
                ))}

                {/* Add Zone - available on every province, not just Baghdad,
                    in case another one grows enough to want this later. */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newZone.nameEn}
                    onChange={(e) => setNewZone((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="Zone name (English)"
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={newZone.nameAr}
                    onChange={(e) => setNewZone((f) => ({ ...f, nameAr: e.target.value }))}
                    placeholder="Zone name (Arabic)"
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => addZone(p.id)}
                    className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    + Add Zone
                  </button>
                </div>

                {/* Direct (un-zoned) districts - identical to how every
                    province worked before zones existed. */}
                {p.districts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <span>{d.nameEn} · {d.nameAr}</span>
                    <div className="flex items-center gap-3">
                      <input
                        key={d.code}
                        defaultValue={d.code}
                        onBlur={(e) => saveDistrictCode(p.id, d, e.target.value.toUpperCase())}
                        maxLength={4}
                        title="Four-letter code used in restaurant codes"
                        className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-center font-mono text-xs uppercase outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => toggleDistrictActive(p.id, d)}
                        className={d.isActive ? 'text-xs text-success' : 'text-xs text-muted-foreground'}
                      >
                        {d.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => deleteDistrict(p.id, d.id)} className="text-xs text-destructive">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {p.districts.length === 0 && p.zones.length === 0 && (
                  <p className="text-sm text-muted-foreground">No districts yet.</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <input
                    value={newDistrict.nameEn}
                    onChange={(e) => setNewDistrict((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="District name (English)"
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={newDistrict.nameAr}
                    onChange={(e) => setNewDistrict((f) => ({ ...f, nameAr: e.target.value }))}
                    placeholder="District name (Arabic)"
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={newDistrict.code}
                    onChange={(e) => setNewDistrict((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 4) }))}
                    placeholder="Code"
                    maxLength={4}
                    title="Four-letter code used in restaurant codes, e.g. KARK for Karkh"
                    className="w-20 rounded-lg border border-border bg-secondary px-3 py-1.5 text-center font-mono text-sm uppercase outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => addDistrict(p.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
                  >
                    Add District
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {provinces.length === 0 && <p className="text-sm text-muted-foreground">No provinces yet.</p>}
      </div>
    </div>
  )
}

// Separated out purely so its own "add district" form field has its own
// local state - with several zones potentially open at once (see
// expandedZoneIds above), that form can't live in the parent without being
// keyed per-zone.
function ZoneDistricts({
  provinceId,
  zone,
  onAdd,
  onToggleActive,
  onSaveCode,
  onDelete,
  onError,
}: {
  provinceId: string
  zone: Zone
  onAdd: (provinceId: string, zoneId: string, form: { nameEn: string; nameAr: string; code: string }) => Promise<void>
  onToggleActive: (provinceId: string, zoneId: string, d: District) => Promise<void>
  onSaveCode: (provinceId: string, zoneId: string, d: District, code: string) => Promise<void>
  onDelete: (provinceId: string, zoneId: string, districtId: string) => Promise<void>
  onError: (err: unknown) => void
}) {
  const [form, setForm] = useState({ nameEn: '', nameAr: '', code: '' })

  const add = async () => {
    if (!form.nameEn.trim() || !form.nameAr.trim() || form.code.trim().length !== 4) return
    try {
      await onAdd(provinceId, zone.id, form)
      setForm({ nameEn: '', nameAr: '', code: '' })
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
      {zone.districts.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm">
          <span>{d.nameEn} · {d.nameAr}</span>
          <div className="flex items-center gap-3">
            <input
              key={d.code}
              defaultValue={d.code}
              onBlur={(e) => onSaveCode(provinceId, zone.id, d, e.target.value.toUpperCase()).catch(onError)}
              maxLength={4}
              title="Four-letter code used in restaurant codes"
              className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center font-mono text-xs uppercase outline-none focus:border-primary"
            />
            <button
              onClick={() => onToggleActive(provinceId, zone.id, d).catch(onError)}
              className={d.isActive ? 'text-xs text-success' : 'text-xs text-muted-foreground'}
            >
              {d.isActive ? 'Active' : 'Inactive'}
            </button>
            <button onClick={() => onDelete(provinceId, zone.id, d.id).catch(onError)} className="text-xs text-destructive">
              Delete
            </button>
          </div>
        </div>
      ))}
      {zone.districts.length === 0 && <p className="text-xs text-muted-foreground">No districts yet.</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <input
          value={form.nameEn}
          onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
          placeholder="District name (English)"
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={form.nameAr}
          onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
          placeholder="District name (Arabic)"
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 4) }))}
          placeholder="Code"
          maxLength={4}
          title="Four-letter code used in restaurant codes"
          className="w-20 rounded-lg border border-border bg-secondary px-3 py-1.5 text-center font-mono text-sm uppercase outline-none focus:border-primary"
        />
        <button onClick={add} className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground">
          Add District
        </button>
      </div>
    </div>
  )
}
