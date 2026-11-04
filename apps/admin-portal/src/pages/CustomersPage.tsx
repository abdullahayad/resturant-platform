import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CalendarCheck, UserPlus, Users } from 'lucide-react'
import { api, UnauthorizedError, type CustomerListItem, type CustomerStats } from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { Pager } from '@/components/Pager'
import { StatCard } from '@/components/StatCard'
import { StatusPill } from '@/components/StatusPill'
import { CustomerDrawer } from '@/components/CustomerDrawer'

type Filter = 'ALL' | 'BLOCKED'

const filters: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All customers' },
  { key: 'BLOCKED', label: 'Blocked' },
]

// Everyone who signed up in the customer app with their WhatsApp number.
// Click a customer for their visits, reviews, bookings and the account
// actions (block, sign out everywhere, delete).
export function CustomersPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<CustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .customers(query || undefined, filter === 'BLOCKED', page)
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
    api.customerStats().then(setStats).catch(() => {})
  }

  useEffect(load, [query, filter, page])

  // Search after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who signed up in the customer app with their WhatsApp number.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={stats ? String(stats.total) : '—'} trend="all-time" icon={Users} />
        <StatCard label="New this week" value={stats ? String(stats.newThisWeek) : '—'} trend="last 7 days" icon={UserPlus} />
        <StatCard label="Visited this week" value={stats ? String(stats.visitedThisWeek) : '—'} trend="scanned visits" icon={CalendarCheck} />
        <StatCard label="Blocked" value={stats ? String(stats.blocked) : '—'} icon={Ban} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterTabs
          options={filters}
          active={filter}
          onChange={(f) => {
            setFilter(f)
            setPage(1)
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="min-w-[240px] rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No customers found.</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Visits</th>
                <th className="px-3 py-2">Reviews</th>
                <th className="px-3 py-2">Following</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/60"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </td>
                  <td className="px-3 py-2">{c.level}</td>
                  <td className="px-3 py-2">{c.visitCount}</td>
                  <td className="px-3 py-2">{c.reviewCount}</td>
                  <td className="px-3 py-2">{c.followCount}</td>
                  <td className="px-3 py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{c.blockedAt && <StatusPill label="Blocked" tone="destructive" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {openId && <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  )
}
