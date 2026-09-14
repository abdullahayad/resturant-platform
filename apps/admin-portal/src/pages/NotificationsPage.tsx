import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type MasterDataItemFull,
  type NotificationItem,
  type NotificationRecipientDetail,
  type Province,
  type RestaurantListItem,
} from '@/lib/api'

type TargetMode = 'ALL' | 'PROVINCE' | 'BUSINESS_TYPE' | 'RESTAURANT'

const emptyForm = {
  titleEn: '',
  titleAr: '',
  bodyEn: '',
  bodyAr: '',
  actionRequired: false,
  targetMode: 'ALL' as TargetMode,
  provinceId: '',
  businessTypeId: '',
  restaurantId: '',
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [businessTypes, setBusinessTypes] = useState<MasterDataItemFull[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<NotificationRecipientDetail[] | null>(null)

  const load = () => {
    setLoading(true)
    api
      .notifications()
      .then(setNotifications)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  useEffect(() => {
    api.provinces().then(setProvinces).catch(() => {})
    api.masterData('business-types').then(setBusinessTypes).catch(() => {})
    api.restaurantsPicker().then(setRestaurants).catch(() => {})
  }, [])

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await api.createNotification({
        titleEn: form.titleEn,
        titleAr: form.titleAr,
        bodyEn: form.bodyEn,
        bodyAr: form.bodyAr,
        actionRequired: form.actionRequired,
        restaurantId: form.targetMode === 'RESTAURANT' ? form.restaurantId : undefined,
        provinceId: form.targetMode === 'PROVINCE' ? form.provinceId : undefined,
        businessTypeId: form.targetMode === 'BUSINESS_TYPE' ? form.businessTypeId : undefined,
      })
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send notification')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setRecipients(null)
      return
    }
    setExpandedId(id)
    setRecipients(null)
    const detail = await api.notificationRecipients(id)
    setRecipients(detail)
    // Fetching recipients marks any unseen replies on it as seen server-side —
    // clear the badge here too instead of waiting on a full reload.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unseenReplyCount: 0 } : n)))
  }

  const remove = async (id: string) => {
    await api.deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (expandedId === id) {
      setExpandedId(null)
      setRecipients(null)
    }
  }

  const canSubmit =
    form.titleEn.trim() &&
    form.titleAr.trim() &&
    form.bodyEn.trim() &&
    form.bodyAr.trim() &&
    (form.targetMode !== 'PROVINCE' || form.provinceId) &&
    (form.targetMode !== 'BUSINESS_TYPE' || form.businessTypeId) &&
    (form.targetMode !== 'RESTAURANT' || form.restaurantId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Broadcast a message or action to restaurants, and track who's read or completed it.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-primary">New Notification</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={form.titleEn}
            onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
            placeholder="Title (English)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.titleAr}
            onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))}
            placeholder="Title (Arabic)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={form.bodyEn}
            onChange={(e) => setForm((f) => ({ ...f, bodyEn: e.target.value }))}
            placeholder="Message (English)"
            rows={3}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={form.bodyAr}
            onChange={(e) => setForm((f) => ({ ...f, bodyAr: e.target.value }))}
            placeholder="Message (Arabic)"
            rows={3}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.actionRequired}
            onChange={(e) => setForm((f) => ({ ...f, actionRequired: e.target.checked }))}
          />
          Action required — restaurants must mark this as done
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Send to:</span>
          {(['ALL', 'PROVINCE', 'BUSINESS_TYPE', 'RESTAURANT'] as TargetMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setForm((f) => ({ ...f, targetMode: mode }))}
              className={
                form.targetMode === mode
                  ? 'rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary'
                  : 'rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground'
              }
            >
              {mode === 'ALL' && 'All Restaurants'}
              {mode === 'PROVINCE' && 'A Province'}
              {mode === 'BUSINESS_TYPE' && 'A Business Type'}
              {mode === 'RESTAURANT' && 'One Restaurant'}
            </button>
          ))}
        </div>

        {form.targetMode === 'PROVINCE' && (
          <select
            value={form.provinceId}
            onChange={(e) => setForm((f) => ({ ...f, provinceId: e.target.value }))}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a province…</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.nameEn}</option>
            ))}
          </select>
        )}
        {form.targetMode === 'BUSINESS_TYPE' && (
          <select
            value={form.businessTypeId}
            onChange={(e) => setForm((f) => ({ ...f, businessTypeId: e.target.value }))}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a business type…</option>
            {businessTypes.map((b) => (
              <option key={b.id} value={b.id}>{b.nameEn}</option>
            ))}
          </select>
        )}
        {form.targetMode === 'RESTAURANT' && (
          <select
            value={form.restaurantId}
            onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a restaurant…</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.nameEn} · {r.codeNumber}</option>
            ))}
          </select>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send Notification'}
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <button onClick={() => toggleExpand(n.id)} className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{n.titleEn}</span>
                  {n.actionRequired && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Action Required</span>
                  )}
                  {n.unseenReplyCount > 0 && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                      {n.unseenReplyCount} new {n.unseenReplyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{n.bodyEn}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  By {n.createdBy.fullName} · {new Date(n.createdAt).toLocaleString()}
                </div>
              </button>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <div>{n.recipientCount} recipient{n.recipientCount === 1 ? '' : 's'}</div>
                <div>{n.readCount} read</div>
                {n.actionRequired && <div>{n.acknowledgedCount} completed</div>}
                <button onClick={() => remove(n.id)} className="mt-1 text-destructive">Delete</button>
              </div>
            </div>

            {expandedId === n.id && (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                {!recipients ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : (
                  <div className="space-y-2">
                    {recipients.map((r) => (
                      <div key={r.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>{r.restaurant.nameEn} · {r.restaurant.codeNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.acknowledgedAt ? '✓ Completed' : r.readAt ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        {r.replyText && (
                          <div className="rounded-lg bg-secondary px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Reply: </span>
                            {r.replyText}
                          </div>
                        )}
                      </div>
                    ))}
                    {recipients.length === 0 && <p className="text-muted-foreground">No recipients.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && notifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No notifications sent yet.
          </div>
        )}
      </div>
    </div>
  )
}
