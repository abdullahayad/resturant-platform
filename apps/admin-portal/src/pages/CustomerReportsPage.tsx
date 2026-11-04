import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type CustomerListItem,
  type ReportAction,
  type ReportItem,
  type ReportReason,
  type ReportStatus,
} from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { Pager } from '@/components/Pager'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { CustomerDrawer } from '@/components/CustomerDrawer'

type Tab = ReportStatus | 'BLOCKED'

const reasonLabels: Record<ReportReason, string> = {
  FAKE_REVIEW: 'Fake review',
  ABUSIVE: 'Abusive language',
  SPAM: 'Spam / advertising',
  UNDISCLOSED_PAID: 'Paid review, not disclosed',
  OTHER: 'Other',
}

const statusTones: Record<ReportStatus, StatusPillTone> = {
  OPEN: 'primary',
  DISMISSED: 'muted',
  ACTIONED: 'success',
}

const date = (iso: string) => new Date(iso).toLocaleDateString()

// Reviews reported from the customer app (by other customers) and the
// partner app (by the restaurant itself), plus everyone currently blocked.
// Hiding the review or blocking its author settles every open report about
// that review at once.
export function CustomerReportsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('OPEN')
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState<ReportItem[]>([])
  const [blocked, setBlocked] = useState<CustomerListItem[]>([])
  const [counts, setCounts] = useState<Record<ReportStatus, number> | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [openCustomer, setOpenCustomer] = useState<string | null>(null)

  const onError = (err: unknown) => {
    if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
    else setError('Could not reach the server.')
  }

  const load = () => {
    setLoading(true)
    setError(null)
    if (tab === 'BLOCKED') {
      api
        .customers(undefined, true, page)
        .then((res) => {
          setBlocked(res.items)
          setTotal(res.total)
          setPageSize(res.pageSize)
        })
        .catch(onError)
        .finally(() => setLoading(false))
      api.reports('OPEN', 1).then((r) => setCounts(r.statusCounts)).catch(() => {})
    } else {
      api
        .reports(tab, page)
        .then((res) => {
          setReports(res.items)
          setTotal(res.total)
          setPageSize(res.pageSize)
          setCounts(res.statusCounts)
        })
        .catch(onError)
        .finally(() => setLoading(false))
    }
  }

  useEffect(load, [tab, page])

  const resolve = async (r: ReportItem, action: ReportAction) => {
    if (action === 'BLOCK_CUSTOMER' && !window.confirm(`Block ${r.reportedCustomer?.name ?? 'this customer'} and hide the review?`)) {
      return
    }
    setBusyId(r.id)
    try {
      await api.resolveReport(r.id, action, notes[r.id]?.trim() || undefined)
      load()
    } catch {
      setError('Could not save the decision.')
    } finally {
      setBusyId(null)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'OPEN', label: `Open reports${counts ? ` (${counts.OPEN})` : ''}` },
    { key: 'ACTIONED', label: 'Actioned' },
    { key: 'DISMISSED', label: 'Dismissed' },
    { key: 'BLOCKED', label: 'Blocked customers' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reported &amp; Blocked</h1>
        <p className="text-sm text-muted-foreground">
          Reviews reported by customers (customer app) or by the restaurant itself (partner app). Hide the review, block
          its author, or dismiss the report.
        </p>
      </div>

      <FilterTabs
        options={tabs}
        active={tab}
        onChange={(t) => {
          setTab(t)
          setPage(1)
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {tab !== 'BLOCKED' && !loading && reports.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      {tab === 'BLOCKED' && !loading && blocked.length === 0 && <p className="text-sm text-muted-foreground">No one is blocked.</p>}

      {tab !== 'BLOCKED' && (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{reasonLabels[r.reason]}</div>
                  <div className="text-xs text-muted-foreground">
                    Reported by{' '}
                    {r.reporterRestaurant
                      ? `the restaurant (${r.reporterRestaurant.nameEn})`
                      : r.reporterCustomer
                        ? `${r.reporterCustomer.name ?? r.reporterCustomer.phone} (customer)`
                        : 'a deleted account'}{' '}
                    · {date(r.createdAt)}
                    {r.review._count.reports > 1 ? ` · ${r.review._count.reports} reports on this review` : ''}
                  </div>
                  {r.note && <p className="mt-1 text-sm">“{r.note}”</p>}
                </div>
                <StatusPill label={r.status} tone={statusTones[r.status]} />
              </div>

              <div className="rounded-lg bg-secondary p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {'★'.repeat(r.review.rating)} · {r.review.reviewerName} · {r.review.restaurant.nameEn}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {date(r.review.createdAt)}
                    {r.review.moderationStatus === 'HIDDEN' ? ' · hidden' : ''}
                  </span>
                </div>
                {r.review.text && (
                  <p className="mt-1 whitespace-pre-wrap" dir="auto">
                    {r.review.text}
                  </p>
                )}
                {r.reportedCustomer && (
                  <button onClick={() => setOpenCustomer(r.reportedCustomer!.id)} className="mt-2 text-xs text-primary hover:underline">
                    Author's account: {r.reportedCustomer.name ?? r.reportedCustomer.phone}
                    {r.reportedCustomer.blockedAt ? ' (blocked)' : ''}
                  </button>
                )}
                {!r.reportedCustomer && (
                  <div className="mt-2 text-xs text-muted-foreground">Written on the review page, without an account.</div>
                )}
              </div>

              {r.status === 'OPEN' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Note (optional, also used as the block reason)"
                    className="min-w-[220px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolve(r, 'HIDE_REVIEW')}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Hide review
                  </button>
                  {r.reportedCustomer && !r.reportedCustomer.blockedAt && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => resolve(r, 'BLOCK_CUSTOMER')}
                      className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                    >
                      Hide &amp; block author
                    </button>
                  )}
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolve(r, 'DISMISS')}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {r.status === 'ACTIONED' ? 'Actioned' : 'Dismissed'}
                  {r.resolvedBy ? ` by ${r.resolvedBy.fullName}` : ''}
                  {r.resolvedAt ? ` · ${date(r.resolvedAt)}` : ''}
                  {r.resolution ? ` · ${r.resolution}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'BLOCKED' && (
        <div className="space-y-2">
          {blocked.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpenCustomer(c.id)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-secondary/60"
            >
              <div>
                <div className="font-medium">
                  {c.name ?? '—'} <span className="text-muted-foreground">· {c.phone}</span>
                </div>
                <div className="text-sm text-destructive">{c.blockedReason}</div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">{c.blockedAt && date(c.blockedAt)}</div>
            </button>
          ))}
        </div>
      )}

      <Pager page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {openCustomer && <CustomerDrawer customerId={openCustomer} onClose={() => setOpenCustomer(null)} onChanged={load} />}
    </div>
  )
}
