import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type District, type Province } from '@/lib/api'

const emptyProvinceForm = { nameEn: '', nameAr: '', code: '' }

export function LocationsPage() {
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newProvince, setNewProvince] = useState(emptyProvinceForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newDistrict, setNewDistrict] = useState(emptyProvinceForm)

  const load = () => {
    setLoading(true)
    api
      .provinces()
      .then(setProvinces)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const addProvince = async () => {
    if (!newProvince.nameEn.trim() || !newProvince.nameAr.trim() || newProvince.code.trim().length !== 2) return
    const created = await api.createProvince(newProvince)
    setProvinces((prev) => [...prev, { ...created, districts: [] }])
    setNewProvince(emptyProvinceForm)
  }

  const toggleProvinceActive = async (p: Province) => {
    const updated = await api.updateProvince(p.id, { isActive: !p.isActive })
    setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)))
  }

  const saveProvinceCode = async (p: Province, code: string) => {
    if (code === p.code || code.trim().length !== 2) return
    const updated = await api.updateProvince(p.id, { code })
    setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)))
  }

  const saveDistrictCode = async (provinceId: string, d: District, code: string) => {
    if (code === d.code || code.trim().length !== 2) return
    const updated = await api.updateDistrict(d.id, { code })
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId ? { ...p, districts: p.districts.map((x) => (x.id === d.id ? updated : x)) } : p,
      ),
    )
  }

  const deleteProvince = async (id: string) => {
    await api.deleteProvince(id)
    setProvinces((prev) => prev.filter((p) => p.id !== id))
  }

  const addDistrict = async (provinceId: string) => {
    if (!newDistrict.nameEn.trim() || !newDistrict.nameAr.trim() || newDistrict.code.trim().length !== 2) return
    const created = await api.createDistrict(provinceId, newDistrict)
    setProvinces((prev) =>
      prev.map((p) => (p.id === provinceId ? { ...p, districts: [...p.districts, created] } : p)),
    )
    setNewDistrict(emptyProvinceForm)
  }

  const toggleDistrictActive = async (provinceId: string, d: District) => {
    const updated = await api.updateDistrict(d.id, { isActive: !d.isActive })
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId ? { ...p, districts: p.districts.map((x) => (x.id === d.id ? updated : x)) } : p,
      ),
    )
  }

  const deleteDistrict = async (provinceId: string, districtId: string) => {
    await api.deleteDistrict(districtId)
    setProvinces((prev) =>
      prev.map((p) =>
        p.id === provinceId ? { ...p, districts: p.districts.filter((d) => d.id !== districtId) } : p,
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
            onChange={(e) => setNewProvince((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 2) }))}
            placeholder="Code"
            maxLength={2}
            title="Two-letter code used in restaurant codes, e.g. BG for Baghdad"
            className="w-16 rounded-lg border border-border bg-secondary px-3 py-2 text-center font-mono text-sm uppercase outline-none focus:border-primary"
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
                <span className="text-xs font-normal text-muted-foreground">({p.districts.length} districts)</span>
              </button>
              <div className="flex items-center gap-3">
                <input
                  key={p.code}
                  defaultValue={p.code}
                  onBlur={(e) => saveProvinceCode(p, e.target.value.toUpperCase())}
                  maxLength={2}
                  title="Two-letter code used in restaurant codes"
                  className="w-12 rounded-lg border border-border bg-secondary px-2 py-1 text-center font-mono text-xs uppercase outline-none focus:border-primary"
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
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {p.districts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <span>{d.nameEn} · {d.nameAr}</span>
                    <div className="flex items-center gap-3">
                      <input
                        key={d.code}
                        defaultValue={d.code}
                        onBlur={(e) => saveDistrictCode(p.id, d, e.target.value.toUpperCase())}
                        maxLength={2}
                        title="Two-letter code used in restaurant codes"
                        className="w-12 rounded-lg border border-border bg-card px-2 py-1 text-center font-mono text-xs uppercase outline-none focus:border-primary"
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
                {p.districts.length === 0 && <p className="text-sm text-muted-foreground">No districts yet.</p>}

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
                    onChange={(e) => setNewDistrict((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="Code"
                    maxLength={2}
                    title="Two-letter code used in restaurant codes, e.g. KR for Karkh"
                    className="w-16 rounded-lg border border-border bg-secondary px-3 py-1.5 text-center font-mono text-sm uppercase outline-none focus:border-primary"
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
