import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type SupportStatus,
  type SupportTicketDetail,
  type SupportTicketItem,
  type SupportTopic,
} from '@/lib/api'
import { FilterTabs } from '@/components/FilterTabs'
import { Pager } from '@/components/Pager'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { CustomerDrawer } from '@/components/CustomerDrawer'
import { cn } from '@/lib/utils'

const topicLabels: Record<SupportTopic, string> = {
  BOOKING: 'Booking problem',
  RESTAURANT_INFO: 'Wrong restaurant info',
  LOGIN: 'Login code',
  ACCOUNT: 'My account',
  OTHER: 'Other',
}

const statusLabels: Record<SupportStatus, string> = {
  OPEN: 'Needs reply',
  WAITING: 'Waiting on customer',
  CLOSED: 'Closed',
}

const statusTones: Record<SupportStatus, StatusPillTone> = {
  OPEN: 'primary',
  WAITING: 'muted',
  CLOSED: 'success',
}

const when = (iso: string) => new Date(iso).toLocaleString()

// Messages customers send from Help in the customer app. Replying moves a
// conversation to "Waiting on customer"; a new customer message brings it
// back to "Needs reply" (even a closed one). The customer sees replies in
// the app's Help screen.
export function CustomerSupportPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<SupportStatus>('OPEN')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<SupportTicketItem[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [counts, setCounts] = useState<Record<SupportStatus, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .supportTickets(filter, page)
      .then((res) => {
        setRows(res.items)
        setTotal(res.total)
        setPageSize(res.pageSize)
        setCounts(res.statusCounts)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, page])
  useEffect(() => {
    setTicket(null)
    if (!openId) return
    api.supportTicket(openId).then(setTicket).catch(() => setError('Could not open this conversation.'))
  }, [openId])

  const send = async () => {
    if (!ticket || !reply.trim()) return
    setSending(true)
    try {
      setTicket(await api.replySupportTicket(ticket.id, reply.trim()))
      setReply('')
      load()
    } catch {
      setError('Could not send the reply.')
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (status: SupportStatus) => {
    if (!ticket) return
    try {
      setTicket(await api.setSupportTicketStatus(ticket.id, status))
      load()
    } catch {
      setError('Could not change the status.')
    }
  }

  const tabs = (Object.keys(statusLabels) as SupportStatus[]).map((s) => ({
    key: s,
    label: `${statusLabels[s]}${counts ? ` (${counts[s]})` : ''}`,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customer Support</h1>
        <p className="text-sm text-muted-foreground">
          Messages customers send from Help in the customer app. They see your replies there.
        </p>
      </div>

      <FilterTabs
        options={tabs}
        active={filter}
        onChange={(f) => {
          setFilter(f)
          setPage(1)
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
          {rows.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              className={cn(
                'w-full rounded-xl border border-border bg-card p-3 text-left hover:bg-secondary/60',
                openId === t.id && 'border-primary',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.customer.name ?? t.customer.phone}</span>
                <span className="text-xs text-muted-foreground">{new Date(t.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {topicLabels[t.topic]}
                {t.restaurant ? ` · ${t.restaurant.nameEn}` : ''}
              </div>
              <div className="mt-1 truncate text-sm">
                {t.lastFromCustomer ? '' : 'You: '}
                {t.lastMessage}
              </div>
            </button>
          ))}
          <Pager page={page} total={total} pageSize={pageSize} onChange={setPage} />
        </div>

        <div>
          {!openId && <p className="text-sm text-muted-foreground">Pick a conversation.</p>}
          {openId && !ticket && <p className="text-sm text-muted-foreground">Loading…</p>}
          {ticket && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <button onClick={() => setCustomerId(ticket.customer.id)} className="font-semibold text-primary hover:underline">
                    {ticket.customer.name ?? 'No name'} · {ticket.customer.phone}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {topicLabels[ticket.topic]}
                    {ticket.restaurant ? ` · ${ticket.restaurant.nameEn}` : ''} · started {when(ticket.createdAt)}
                    {ticket.customer.blockedAt ? ' · BLOCKED' : ''}
                  </div>
                </div>
                <StatusPill label={statusLabels[ticket.status]} tone={statusTones[ticket.status]} />
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {ticket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      m.fromAdmin ? 'ml-auto bg-primary/15' : 'bg-secondary',
                    )}
                  >
                    <div className="whitespace-pre-wrap" dir="auto">{m.text}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {m.fromAdmin ? m.fromAdmin.fullName : 'Customer'} · {when(m.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  dir="auto"
                  placeholder="Write a reply (Arabic or English)…"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={send}
                    disabled={sending || !reply.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                  {ticket.status !== 'CLOSED' ? (
                    <button onClick={() => setStatus('CLOSED')} className="rounded-lg border border-border px-4 py-2 text-sm">
                      Close
                    </button>
                  ) : (
                    <button onClick={() => setStatus('OPEN')} className="rounded-lg border border-border px-4 py-2 text-sm">
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {(ticket.recentBookings.length > 0 || ticket.recentVisits.length > 0) && (
                <div className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent bookings</div>
                    {ticket.recentBookings.length === 0 && <div className="text-muted-foreground">None</div>}
                    {ticket.recentBookings.map((b) => (
                      <div key={b.id}>
                        {b.event.titleEn} · {b.restaurant.nameEn}
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.reservationDate).toLocaleDateString()} · {b.partySize} guests · {b.status}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent visits</div>
                    {ticket.recentVisits.length === 0 && <div className="text-muted-foreground">None</div>}
                    {ticket.recentVisits.map((v) => (
                      <div key={v.id}>
                        {v.restaurant.nameEn} <span className="text-xs text-muted-foreground">· {v.visitDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {customerId && <CustomerDrawer customerId={customerId} onClose={() => setCustomerId(null)} />}
    </div>
  )
}
