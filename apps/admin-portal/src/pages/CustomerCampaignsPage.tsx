import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type CampaignItem,
  type CampaignPayload,
  type HomeBannerLink,
  type Mood,
  type RestaurantListItem,
} from '@/lib/api'
import { Pager } from '@/components/Pager'
import { cn } from '@/lib/utils'

const inputClass = 'rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary'

const linkLabels: Record<HomeBannerLink, string> = {
  NONE: 'Home',
  RESTAURANT: 'A restaurant page',
  MOOD: 'A mood',
  HEALTHY: 'Healthy restaurants',
  OFFERS: 'Offers tab',
  EVENTS: 'Events tab',
}

const emptyForm: CampaignPayload = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '', linkType: 'NONE' }

// Push notifications to customers' phones. Only customers who allow
// campaigns (Profile > Notifications) get them, and nobody gets more than
// 2 in a week - so the count before sending can be lower than expected.
export function CustomerCampaignsPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CampaignPayload>(emptyForm)
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [moods, setMoods] = useState<Mood[]>([])
  const [audience, setAudience] = useState<number | null>(null)
  const [history, setHistory] = useState<CampaignItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadHistory = () => {
    api
      .campaigns(page)
      .then((res) => {
        setHistory(res.items)
        setTotal(res.total)
        setPageSize(res.pageSize)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
  }
  useEffect(loadHistory, [page])
  useEffect(() => {
    api.restaurantsPicker('APPROVED').then(setRestaurants).catch(() => {})
    api.moods().then(setMoods).catch(() => {})
  }, [])

  // Live count of phones that would get it, as the audience changes.
  useEffect(() => {
    let cancelled = false
    api
      .previewCampaign({ minLevel: form.minLevel, followersOfRestaurantId: form.followersOfRestaurantId })
      .then((r) => {
        if (!cancelled) setAudience(r.customers)
      })
      .catch(() => {
        if (!cancelled) setAudience(null)
      })
    return () => {
      cancelled = true
    }
  }, [form.minLevel, form.followersOfRestaurantId])

  const set = <K extends keyof CampaignPayload>(key: K, value: CampaignPayload[K]) => setForm((f) => ({ ...f, [key]: value }))

  const ready =
    form.titleEn.trim() &&
    form.titleAr.trim() &&
    form.bodyEn.trim() &&
    form.bodyAr.trim() &&
    ((form.linkType !== 'RESTAURANT' && form.linkType !== 'MOOD') || !!form.linkValue) &&
    !!audience

  const send = async () => {
    if (!window.confirm(`Send this push to ${audience} customers now? It can't be taken back.`)) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const res = await api.sendCampaign({
        ...form,
        linkValue: form.linkType === 'RESTAURANT' || form.linkType === 'MOOD' ? form.linkValue : undefined,
      })
      setNotice(`Sent to ${res.recipientCount} customers.`)
      setForm(emptyForm)
      setPage(1)
      loadHistory()
    } catch {
      setError('Could not send - check the fields, or nobody matches this audience right now.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customer Push Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Push notifications to customers' phones. Only customers who allow campaigns get them, and nobody gets more
          than 2 a week.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-primary">New campaign</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Title (English)
            <input value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} maxLength={65} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Title (Arabic)
            <input dir="rtl" value={form.titleAr} onChange={(e) => set('titleAr', e.target.value)} maxLength={65} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Message (English)
            <textarea value={form.bodyEn} onChange={(e) => set('bodyEn', e.target.value)} maxLength={178} rows={2} className={cn(inputClass, 'mt-1 block w-full')} />
          </label>
          <label className="text-sm">
            Message (Arabic)
            <textarea dir="rtl" value={form.bodyAr} onChange={(e) => set('bodyAr', e.target.value)} maxLength={178} rows={2} className={cn(inputClass, 'mt-1 block w-full')} />
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
              <select value={form.linkValue ?? ''} onChange={(e) => set('linkValue', e.target.value || undefined)} className={cn(inputClass, 'mt-1 block w-full')}>
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
              <select value={form.linkValue ?? ''} onChange={(e) => set('linkValue', e.target.value || undefined)} className={cn(inputClass, 'mt-1 block w-full')}>
                <option value="">Select…</option>
                {moods.map((m) => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.nameEn}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Minimum level
              <select
                value={form.minLevel ?? ''}
                onChange={(e) => set('minLevel', e.target.value ? Number(e.target.value) : undefined)}
                className={cn(inputClass, 'mt-1 block w-full')}
              >
                <option value="">Everyone</option>
                {[2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>Level {l} and up</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Only followers of
              <select
                value={form.followersOfRestaurantId ?? ''}
                onChange={(e) => set('followersOfRestaurantId', e.target.value || undefined)}
                className={cn(inputClass, 'mt-1 block w-full')}
              >
                <option value="">Any restaurant</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.nameEn} · {r.codeNumber}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="text-sm">
            Will reach <span className="font-semibold">{audience ?? '…'}</span> customers right now.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-xs rounded-xl bg-secondary p-3 text-sm" dir="rtl">
            <div className="font-semibold">{form.titleAr || 'العنوان'}</div>
            <div className="text-muted-foreground">{form.bodyAr || 'نص الإشعار'}</div>
          </div>
          <button
            onClick={send}
            disabled={!ready || sending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send now'}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Sent campaigns</div>
        {history.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        {history.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{c.titleEn} · <span dir="rtl">{c.titleAr}</span></span>
              <span className="text-xs text-muted-foreground">{new Date(c.sentAt).toLocaleString()}</span>
            </div>
            <div className="text-muted-foreground">{c.bodyEn}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {c.recipientCount} customers · opens {linkLabels[c.linkType]}
              {c.minLevel ? ` · Level ${c.minLevel}+` : ''}
              {c.followersOfRestaurantId ? ' · followers of one restaurant' : ''}
              {c.sentBy ? ` · by ${c.sentBy.fullName}` : ''}
            </div>
          </div>
        ))}
        <Pager page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
