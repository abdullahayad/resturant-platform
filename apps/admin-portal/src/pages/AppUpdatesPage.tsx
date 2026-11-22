import { useEffect, useState } from 'react'
import { api, type AppUpdateRule, type AppVersionSettings } from '@/lib/api'

const inputClass = 'rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary'

const APPS: { key: keyof AppVersionSettings; title: string; current: string }[] = [
  { key: 'customer', title: 'Customer app (LiGETA)', current: 'com.ligeta.app' },
  { key: 'partner', title: 'Restaurant app (LiGETA Restaurant)', current: 'com.ligeta.partner' },
]

// The "new version" screen in the apps. Set a minimum version and every
// phone running an older one gets a full-screen page with an Update button
// to the store: "Forced" has no way past it, "Soft" adds a "Later" link.
// Leave the version empty and nobody sees it.
export function AppUpdatesPage() {
  const [form, setForm] = useState<AppVersionSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.appVersionSettings().then(setForm).catch(() => setMessage({ ok: false, text: 'Could not load the settings.' }))
  }, [])

  const set = (app: keyof AppVersionSettings, patch: Partial<AppUpdateRule>) => {
    setMessage(null)
    setForm((f) => (f ? { ...f, [app]: { ...f[app], ...patch } } : f))
  }

  const save = async () => {
    if (!form) return
    setSaving(true)
    setMessage(null)
    try {
      setForm(await api.updateAppVersionSettings(form))
      setMessage({ ok: true, text: 'Saved. Phones check when the app opens or comes back to the front.' })
    } catch {
      setMessage({ ok: false, text: 'Could not save - versions look like 1.4.0 and the App Store link must start with https://.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">App Updates</h1>
        <p className="text-sm text-muted-foreground">
          Make people update. Any phone running an app version lower than the minimum below sees a full-screen
          "new version" page with an Update button that opens Google Play or the App Store. Only raise the minimum
          after the new version is live in the store, or people will be sent to a store page that doesn't have it yet.
        </p>
      </div>

      {!form ? (
        message ? <p className="text-sm text-destructive">{message.text}</p> : <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {APPS.map(({ key, title, current }) => {
            const rule = form[key]
            return (
              <div key={key} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-primary">{title}</div>
                  <p className="text-xs text-muted-foreground">
                    {rule.minVersion
                      ? `On: phones older than ${rule.minVersion} see the update page (${rule.mode === 'force' ? 'no way past' : 'with "Later"'}).`
                      : 'Off: nobody is asked to update.'}{' '}
                    Android package {current}.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Minimum version</span>
                    <input
                      className={inputClass}
                      placeholder="e.g. 1.5.0 - empty = off"
                      value={rule.minVersion ?? ''}
                      onChange={(e) => set(key, { minVersion: e.target.value.trim() || null })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <select className={inputClass} value={rule.mode} onChange={(e) => set(key, { mode: e.target.value as AppUpdateRule['mode'] })}>
                      <option value="force">Forced - must update to continue</option>
                      <option value="soft">Soft - can tap "Later"</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">App Store link (iPhone)</span>
                    <input
                      className={inputClass}
                      placeholder="https://apps.apple.com/app/…"
                      value={rule.iosUrl ?? ''}
                      onChange={(e) => set(key, { iosUrl: e.target.value.trim() || null })}
                    />
                    <span className="text-xs text-muted-foreground">Until this is set, iPhones are never blocked.</span>
                  </label>
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {message && <span className={message.ok ? 'text-sm text-green-600' : 'text-sm text-destructive'}>{message.text}</span>}
          </div>
        </>
      )}
    </div>
  )
}
