import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type CustomerListItem } from '@/lib/api'
import { Pager } from '@/components/Pager'
import { CustomerDrawer } from '@/components/CustomerDrawer'

// Everyone currently blocked, with the reason - open one to unblock.
// A "Report" button in the customer and partner apps (fake review, abuse,
// no-show) will feed a reports queue here next; until then a review can
// be hidden from Reviews, and a customer blocked from Customers.
export function CustomerReportsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CustomerListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .customers(undefined, true, page)
      .then((res) => {
        setRows(res.items)
        setTotal(res.total)
        setPageSize(res.pageSize)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reported &amp; Blocked</h1>
        <p className="text-sm text-muted-foreground">
          Blocked customers can't sign in, and their visit code no longer counts. Open one to see why, or to unblock.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Reports queue - coming next.</span> Once the apps have a
        Report button (fake review, abusive language, spam, no-show), reports will line up here with dismiss / warn /
        remove / block actions. For now: hide a review from <b>Content → Reviews</b>, block a customer from{' '}
        <b>Customers</b>.
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No one is blocked.</p>}

      <div className="space-y-2">
        {rows.map((c) => (
          <button
            key={c.id}
            onClick={() => setOpenId(c.id)}
            className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-secondary/60"
          >
            <div>
              <div className="font-medium">
                {c.name ?? '—'} <span className="text-muted-foreground">· {c.phone}</span>
              </div>
              <div className="text-sm text-destructive">{c.blockedReason}</div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">
              {c.blockedAt && new Date(c.blockedAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {openId && <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  )
}
