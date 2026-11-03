import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type HomeBanner,
  type HomeBannerLink,
  type HomeBannerPayload,
  type Mood,
  type RestaurantListItem,
} from '@/lib/api'
import { Switch } from '@/components/Switch'
import { cn } from '@/lib/utils'

const inputClass = 'rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary'

const linkLabels: Record<HomeBannerLink, string> = {
  NONE: 'Nothing (just a message)',
  RESTAURANT: 'A restaurant page',
  MOOD: 'A mood',
  HEALTHY: 'Healthy restaurants',
  OFFERS: 'Offers tab',
  EVENTS: 'Events tab',
}

const emptyForm: HomeBannerPayload = {
  titleEn: '',
  titleAr: '',
  subtitleEn: null,
  subtitleAr: null,
  imageUrl: null,
  color: '#C2540A',
  linkType: 'NONE',
  linkValue: null,
  startsAt: null,
  endsAt: null,
  isActive: false,
  sortOrder: 0,
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const fromDateInput = (value: string) => (value ? new Date(value + 'T00:00:00').toISOString() : null)

function bannerWindow(b: HomeBanner) {
  if (!b.startsAt && !b.endsAt) return 'Always'
  const from = b.startsAt ? new Date(b.startsAt).toLocaleDateString() : '…'
  const until = b.endsAt ? new Date(b.endsAt).toLocaleDateString() : '…'
  return `${from} – ${until}`
}

// The customer app's Home banners: seasonal campaigns (Ramadan, Eid,
// grilling season), new features or a partner's promotion. Switched-on
// banners inside their dates slide at the top of Home. The cuisine row and
// the chefs row fill themselves from live restaurants; a cuisine's emoji
// is set under Master Data > Food Categories.
export function HomeLayoutPage() {
  const navigate = useNavigate()
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [moods, setMoods] = useState<Mood[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<HomeBannerPayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .homeBanners()
      .then(setBanners)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  useEffect(() => {
    api.restaurantsPicker('APPROVED').then(setRestaurants).catch(() => {})
    api.moods().then(setMoods).catch(() => {})
  }, [])

  const set = <K extends keyof HomeBannerPayload>(key: K, value: HomeBannerPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const edit = (b: HomeBanner) => {
    const { id, ...rest } = b
    setEditingId(id)
    setForm(rest)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    // Empty texts go to the server as null, and a link value only travels
    // with the link types that use one.
    const payload: HomeBannerPayload = {
      ...form,
      subtitleEn: form.subtitleEn?.trim() || null,
      subtitleAr: form.subtitleAr?.trim() || null,
      linkValue: form.linkType === 'RESTAURANT' || form.linkType === 'MOOD' ? form.linkValue : null,
    }
    try {
      if (editingId) await api.updateHomeBanner(editingId, payload)
      else await api.createHomeBanner(payload)
      reset()
      load()
    } catch {
      setError('Could not save the banner - check the fields (title in both languages, a target for restaurant/mood links, end after start).')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (b: HomeBanner) => {
    const { id, ...rest } = b
    await api.updateHomeBanner(id, { ...rest, isActive: !b.isActive }).catch(() => setError('Could not save.'))
    load()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const other = banners[index + dir]
    const current = banners[index]
    if (!other) return
    const { id: currentId, ...currentRest } = current
    const { id: otherId, ...otherRest } = other
    await Promise.all([
      api.updateHomeBanner(currentId, { ...currentRest, sortOrder: other.sortOrder }),
      api.updateHomeBanner(otherId, { ...otherRest, sortOrder: current.sortOrder }),
    ]).catch(() => setError('Could not reorder.'))
    load()
  }

  const remove = async (b: HomeBanner) => {
    if (!window.confirm(`Delete "${b.titleEn}"?`)) return
    await api.deleteHomeBanner(b.id).catch(() => setError('Could not delete.'))
    if (editingId === b.id) reset()
    load()
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await api.uploadImage(file)
      set('imageUrl', url)
    } catch {
      setError('Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customer Home Layout</h1>
        <p className="text-sm text-muted-foreground">
          Banners slide at the top of the customer app's Home. The cuisine photo row and the chefs row fill
          themselves from live restaurants — set each cuisine's emoji under Master Data → Food Categories.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-primary">{editingId ? 'Edit banner' : 'New banner'}</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Title (English)
            <input value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} maxLength={80} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Title (Arabic)
            <input dir="rtl" value={form.titleAr} onChange={(e) => set('titleAr', e.target.value)} maxLength={80} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Subtitle (English, optional)
            <input value={form.subtitleEn ?? ''} onChange={(e) => set('subtitleEn', e.target.value)} maxLength={160} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Subtitle (Arabic, optional)
            <input dir="rtl" value={form.subtitleAr ?? ''} onChange={(e) => set('subtitleAr', e.target.value)} maxLength={160} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <div className="text-sm">
            Image (optional, wide photo looks best)
            <div className="mt-1 flex items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} className="text-sm" />
              {uploading && <span className="text-muted-foreground">Uploading…</span>}
              {form.imageUrl && (
                <button type="button" onClick={() => set('imageUrl', null)} className="text-destructive">
                  Remove
                </button>
              )}
            </div>
          </div>
          <label className="text-sm">
            Background colour (used when there's no image)
            <input type="color" value={form.color ?? '#C2540A'} onChange={(e) => set('color', e.target.value)} className="mt-1 block h-9 w-20 rounded border border-border bg-secondary" />
          </label>
          <label className="text-sm">
            Tapping it opens
            <select value={form.linkType} onChange={(e) => set('linkType', e.target.value as HomeBannerLink)} className={cn(inputClass, 'mt-1 block w-full')}>
              {(Object.keys(linkLabels) as HomeBannerLink[]).map((k) => (
                <option key={k} value={k}>{linkLabels[k]}</option>
              ))}
            </select>
          </label>
          {form.linkType === 'RESTAURANT' && (
            <label className="text-sm">
              Restaurant
              <select value={form.linkValue ?? ''} onChange={(e) => set('linkValue', e.target.value || null)} className={cn(inputClass, 'mt-1 block w-full')}>
                <option value="">Select…</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.nameEn} · {r.codeNumber}</option>
                ))}
              </select>
            </label>
          )}
          {form.linkType === 'MOOD' && (
            <label className="text-sm">
              Mood
              <select value={form.linkValue ?? ''} onChange={(e) => set('linkValue', e.target.value || null)} className={cn(inputClass, 'mt-1 block w-full')}>
                <option value="">Select…</option>
                {moods.map((m) => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.nameEn}{m.isActive ? '' : ' (off)'}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm">
            Starts (optional)
            <input type="date" value={toDateInput(form.startsAt)} onChange={(e) => set('startsAt', fromDateInput(e.target.value))} className={cn(inputClass, 'mt-1 block')} />
          </label>
          <label className="text-sm">
            Ends (optional)
            <input type="date" value={toDateInput(form.endsAt)} onChange={(e) => set('endsAt', fromDateInput(e.target.value))} className={cn(inputClass, 'mt-1 block')} />
          </label>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</div>
          <div
            className="relative flex h-28 max-w-md flex-col justify-end overflow-hidden rounded-2xl p-4 text-white"
            style={{ backgroundColor: form.color ?? '#C2540A' }}
            dir="rtl"
          >
            {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            {form.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />}
            <div className="relative text-lg font-bold">{form.titleAr || 'العنوان'}</div>
            {form.subtitleAr && <div className="relative text-sm opacity-90">{form.subtitleAr}</div>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={form.isActive} onChange={() => set('isActive', !form.isActive)} label="Show in the app" />
          <button
            onClick={save}
            disabled={saving || !form.titleEn.trim() || !form.titleAr.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add banner'}
          </button>
          {editingId && (
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && banners.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}

      <div className="space-y-2">
        {banners.map((b, i) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div
              className="h-14 w-24 shrink-0 overflow-hidden rounded-lg"
              style={{ backgroundColor: b.color ?? '#C2540A' }}
            >
              {b.imageUrl && <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{b.titleEn} · <span dir="rtl">{b.titleAr}</span></div>
              <div className="text-xs text-muted-foreground">
                {linkLabels[b.linkType]} · {bannerWindow(b)}
              </div>
            </div>
            <Switch checked={b.isActive} onChange={() => toggle(b)} label={b.isActive ? 'On' : 'Off'} />
            <div className="flex gap-1">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-30">↑</button>
              <button disabled={i === banners.length - 1} onClick={() => move(i, 1)} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-30">↓</button>
            </div>
            <button onClick={() => edit(b)} className="rounded-lg border border-border px-3 py-1.5 text-sm">Edit</button>
            <button onClick={() => remove(b)} className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
