import { useEffect, useState } from 'react'
import { api, type MasterDataItemFull, type Mood, type RamadanSettings } from '@/lib/api'
import { Switch } from '@/components/Switch'

const inputClass = 'rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary'

// Ramadan mode for the customer app's Home. Switched on, the app counts
// down the week before the first day, then shows "Ramadan day N" with
// iftar and suhoor times (worked out on each phone for its location) and
// two shortcuts: the iftar event type and a suhoor mood. Set the dates
// once the moon is sighted - they move by a day either way.
export function RamadanSettingsCard({ moods }: { moods: Mood[] }) {
  const [form, setForm] = useState<RamadanSettings | null>(null)
  const [eventTypes, setEventTypes] = useState<MasterDataItemFull[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.ramadanSettings().then(setForm).catch(() => setMessage({ ok: false, text: 'Could not load the Ramadan settings.' }))
    api.masterData('event-types').then(setEventTypes).catch(() => {})
  }, [])

  if (!form) return null
  const set = <K extends keyof RamadanSettings>(key: K, value: RamadanSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      setForm(await api.updateRamadanSettings(form))
      setMessage({ ok: true, text: 'Saved. The app picks it up the next time Home opens.' })
    } catch {
      setMessage({ ok: false, text: 'Could not save - the last day must be after the first, and Ramadan is at most 30 days.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-primary">🌙 Ramadan mode</div>
          <p className="text-xs text-muted-foreground">
            A Ramadan card at the top of Home: a countdown the week before, then the day number, today's iftar and
            suhoor times for the customer's location, and the shortcuts below.
          </p>
        </div>
        <Switch checked={form.enabled} onChange={() => set('enabled', !form.enabled)} label="Ramadan mode" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">First day of Ramadan</span>
          <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Last day of Ramadan</span>
          <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">"Iftar" button opens events of type</span>
          <select
            className={inputClass}
            value={form.iftarEventTypeId ?? ''}
            onChange={(e) => set('iftarEventTypeId', e.target.value || null)}
          >
            <option value="">No iftar button</option>
            {eventTypes.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>
                {(t.icon ? t.icon + ' ' : '') + t.nameEn + ' / ' + t.nameAr}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Add an "Iftar" type under Master Data → Event Types if missing.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">"Suhoor" button opens the mood</span>
          <select className={inputClass} value={form.suhoorMoodId ?? ''} onChange={(e) => set('suhoorMoodId', e.target.value || null)}>
            <option value="">No suhoor button</option>
            {moods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji + ' ' + m.nameEn + ' / ' + m.nameAr + (m.isActive ? '' : ' (switched off)')}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Tip: a seasonal mood with "open after midnight" lists places open for suhoor. It must be switched on.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Ramadan settings'}
        </button>
        {message && <span className={message.ok ? 'text-sm text-green-600' : 'text-sm text-destructive'}>{message.text}</span>}
      </div>
    </div>
  )
}
