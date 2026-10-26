import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  api,
  UnauthorizedError,
  type MasterDataItemFull,
  type Mood,
  type MoodGroup,
  type MoodPayload,
  type RestaurantClassValue,
} from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { Switch } from '@/components/Switch'
import { cn } from '@/lib/utils'

const groupLabels: Record<MoodGroup, string> = {
  CLASSIC: 'Classic',
  PEOPLE: 'With people',
  PLACE: 'Place & feeling',
  TIME: 'By time',
  FOOD: 'By food',
  SEASONAL: 'Seasonal',
}

const classLabels: Record<RestaurantClassValue, string> = {
  LUXURY: 'Luxury',
  UPSCALE: 'Upscale',
  MODERATE: 'Moderate',
  BUDGET: 'Budget',
}

const emptyForm: MoodPayload = {
  nameEn: '',
  nameAr: '',
  emoji: '',
  group: 'CLASSIC',
  foodsEn: '',
  foodsAr: '',
  matchNotes: '',
  businessTypeIds: [],
  foodCategoryIds: [],
  facilityIds: [],
  eventTypeIds: [],
  classes: [],
  healthyOnly: false,
  openAfterMidnight: false,
  startsAt: null,
  endsAt: null,
  isActive: false,
}

const inputClass = 'rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary'

// Toggleable chips for picking several master-data items (or classes) at once.
function ChipPicker<T extends string>({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string
  hint?: string
  options: { value: T; label: string }[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.length === 0 && <span className="text-xs text-muted-foreground">None set up in Master Data yet.</span>}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs',
              selected.includes(o.value)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const toOptions = (items: MasterDataItemFull[]) =>
  items.map((i) => ({ value: i.id, label: i.isActive ? i.nameEn : `${i.nameEn} (off)` }))

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const fromDateInput = (value: string) => (value ? new Date(value + 'T00:00:00').toISOString() : null)

export function MoodsPage() {
  const navigate = useNavigate()
  const [moods, setMoods] = useState<Mood[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'ON' | MoodGroup>('ALL')
  const [form, setForm] = useState<MoodPayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [businessTypes, setBusinessTypes] = useState<MasterDataItemFull[]>([])
  const [foodCategories, setFoodCategories] = useState<MasterDataItemFull[]>([])
  const [facilities, setFacilities] = useState<MasterDataItemFull[]>([])
  const [eventTypes, setEventTypes] = useState<MasterDataItemFull[]>([])

  useEffect(() => {
    Promise.all([
      api.moods(),
      api.masterData('business-types'),
      api.masterData('food-categories'),
      api.masterData('facilities'),
      api.masterData('event-types'),
    ])
      .then(([m, bt, fc, fa, et]) => {
        setMoods(m)
        setBusinessTypes(bt)
        setFoodCategories(fc)
        setFacilities(fa)
        setEventTypes(et)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(
    () => moods.filter((m) => filter === 'ALL' || (filter === 'ON' ? m.isActive : m.group === filter)),
    [moods, filter],
  )
  const activeCount = moods.filter((m) => m.isActive).length

  const set = <K extends keyof MoodPayload>(key: K, value: MoodPayload[K]) => setForm((f) => ({ ...f, [key]: value }))

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const startEdit = (mood: Mood) => {
    const { id, sortOrder, ...rest } = mood
    void sortOrder
    setEditingId(id)
    setForm({ ...rest, foodsEn: rest.foodsEn ?? '', foodsAr: rest.foodsAr ?? '', matchNotes: rest.matchNotes ?? '' })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const submit = async () => {
    setError(null)
    setSaving(true)
    const payload: MoodPayload = {
      ...form,
      foodsEn: form.foodsEn?.trim() || null,
      foodsAr: form.foodsAr?.trim() || null,
      matchNotes: form.matchNotes?.trim() || null,
    }
    try {
      if (editingId) {
        const updated = await api.updateMood(editingId, payload)
        setMoods((prev) => prev.map((m) => (m.id === editingId ? updated : m)))
      } else {
        const created = await api.createMood(payload)
        setMoods((prev) => [...prev, created])
      }
      closeForm()
    } catch {
      setError('Save failed. Check the season dates (end must be after start).')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (mood: Mood) => {
    const updated = await api.setMoodActive(mood.id, !mood.isActive)
    setMoods((prev) => prev.map((m) => (m.id === mood.id ? updated : m)))
  }

  // Moves within the full list (not just the filtered view), so the order
  // saved is always the order customers see.
  const move = async (mood: Mood, direction: -1 | 1) => {
    const index = moods.findIndex((m) => m.id === mood.id)
    const target = index + direction
    if (target < 0 || target >= moods.length) return
    const next = [...moods]
    ;[next[index], next[target]] = [next[target], next[index]]
    setMoods(next)
    try {
      setMoods(await api.reorderMoods(next.map((m) => m.id)))
    } catch {
      setError('Could not save the new order.')
    }
  }

  const remove = async (mood: Mood) => {
    if (!confirm(`Delete the mood "${mood.nameEn}"? This can't be undone. To just hide it, switch it off instead.`)) return
    await api.deleteMood(mood.id)
    setMoods((prev) => prev.filter((m) => m.id !== mood.id))
    if (editingId === mood.id) closeForm()
  }

  const ruleSummary = (m: Mood) => {
    const parts = [
      m.businessTypeIds.length && `${m.businessTypeIds.length} business type(s)`,
      m.foodCategoryIds.length && `${m.foodCategoryIds.length} food categor(ies)`,
      m.facilityIds.length && `${m.facilityIds.length} facilit(ies)`,
      m.eventTypeIds.length && `${m.eventTypeIds.length} event type(s)`,
      m.classes.length && m.classes.map((c) => classLabels[c]).join('/'),
      m.healthyOnly && 'Healthy only',
      m.openAfterMidnight && 'After midnight',
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'No rules yet'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customer Moods</h1>
          <p className="text-sm text-muted-foreground">
            The "What's the mood today?" tiles on the customer app's Home screen. Home shows the first 9 switched-on
            moods; the 10th tile is "More moods", which opens all of them. A restaurant appears under a mood when it
            matches at least one item in every list you fill and has all the facilities you pick — empty lists don't
            filter.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Add mood
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {formOpen && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-primary">{editingId ? 'Edit mood' : 'Add mood'}</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[90px_1fr_1fr_180px]">
            <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="Emoji" className={cn(inputClass, 'text-center text-lg')} />
            <input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Name (English)" className={inputClass} />
            <input value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} placeholder="Name (Arabic)" dir="rtl" className={inputClass} />
            <select value={form.group} onChange={(e) => set('group', e.target.value as MoodGroup)} className={inputClass}>
              {(Object.keys(groupLabels) as MoodGroup[]).map((g) => (
                <option key={g} value={g}>
                  {groupLabels[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground">Food / restaurant types</div>
            <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <textarea value={form.foodsEn ?? ''} onChange={(e) => set('foodsEn', e.target.value)} rows={2} placeholder="e.g. Kebab, tikka, masgouf, mixed grill" className={inputClass} />
              <textarea value={form.foodsAr ?? ''} onChange={(e) => set('foodsAr', e.target.value)} rows={2} dir="rtl" placeholder="مثال: كباب، تكة، مسكوف" className={inputClass} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <div className="text-xs font-semibold">Matched by</div>
            <ChipPicker label="Business types (any)" options={toOptions(businessTypes)} selected={form.businessTypeIds} onChange={(v) => set('businessTypeIds', v)} />
            <ChipPicker label="Food categories (any)" options={toOptions(foodCategories)} selected={form.foodCategoryIds} onChange={(v) => set('foodCategoryIds', v)} />
            <ChipPicker label="Facilities (must have all)" options={toOptions(facilities)} selected={form.facilityIds} onChange={(v) => set('facilityIds', v)} />
            <ChipPicker label="Has an upcoming event of type (any)" options={toOptions(eventTypes)} selected={form.eventTypeIds} onChange={(v) => set('eventTypeIds', v)} />
            <ChipPicker
              label="Price class (any)"
              options={(Object.keys(classLabels) as RestaurantClassValue[]).map((c) => ({ value: c, label: classLabels[c] }))}
              selected={form.classes}
              onChange={(v) => set('classes', v)}
            />
            <div className="flex flex-wrap gap-6">
              <Switch checked={form.healthyOnly} onChange={() => set('healthyOnly', !form.healthyOnly)} label="Healthy-tagged only" />
              <Switch checked={form.openAfterMidnight} onChange={() => set('openAfterMidnight', !form.openAfterMidnight)} label="Open after midnight" />
            </div>
            <textarea
              value={form.matchNotes ?? ''}
              onChange={(e) => set('matchNotes', e.target.value)}
              rows={2}
              placeholder="Notes for the team (e.g. which facilities still need adding to Master Data)"
              className={cn(inputClass, 'w-full')}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Season starts (optional)
              <input type="date" value={toDateInput(form.startsAt)} onChange={(e) => set('startsAt', fromDateInput(e.target.value))} className={cn(inputClass, 'mt-1 block')} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Season ends (optional)
              <input type="date" value={toDateInput(form.endsAt)} onChange={(e) => set('endsAt', fromDateInput(e.target.value))} className={cn(inputClass, 'mt-1 block')} />
            </label>
            <Switch checked={form.isActive} onChange={() => set('isActive', !form.isActive)} label="Show in the app" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving || !form.nameEn.trim() || !form.nameAr.trim() || !form.emoji.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {editingId ? 'Save Changes' : 'Add'}
            </button>
            <button onClick={closeForm} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      <FilterTabs
        options={[
          { key: 'ALL' as const, label: `All (${moods.length})` },
          { key: 'ON' as const, label: `Showing in app (${activeCount})` },
          ...(Object.keys(groupLabels) as MoodGroup[]).map((g) => ({ key: g, label: groupLabels[g] })),
        ]}
        active={filter}
        onChange={setFilter}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Mood</th>
              <th className="px-3 py-2 font-medium">Food / restaurant types</th>
              <th className="px-3 py-2 font-medium">Matched by</th>
              <th className="px-3 py-2 font-medium">In app</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((mood) => (
              <tr key={mood.id} className={cn('border-b border-border align-top last:border-0', !mood.isActive && 'opacity-70')}>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => move(mood, -1)} aria-label="Move up" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <ArrowUp className="size-4" />
                    </button>
                    <button onClick={() => move(mood, 1)} aria-label="Move down" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mood.emoji}</span>
                    <div>
                      <div className="font-medium">{mood.nameEn}</div>
                      <div className="text-muted-foreground" dir="rtl">{mood.nameAr}</div>
                      <div className="text-xs text-muted-foreground">
                        {groupLabels[mood.group]}
                        {(mood.startsAt || mood.endsAt) &&
                          ` · ${toDateInput(mood.startsAt) || '…'} → ${toDateInput(mood.endsAt) || '…'}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="max-w-xs px-3 py-2 text-muted-foreground">{mood.foodsEn}</td>
                <td className="max-w-xs px-3 py-2">
                  <div>{ruleSummary(mood)}</div>
                  {mood.matchNotes && <div className="text-xs text-muted-foreground">Note: {mood.matchNotes}</div>}
                </td>
                <td className="px-3 py-2">
                  <Switch checked={mood.isActive} onChange={() => toggleActive(mood)} />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button onClick={() => startEdit(mood)} className="mr-3 text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                  <button onClick={() => remove(mood)} className="text-destructive">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No moods here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
