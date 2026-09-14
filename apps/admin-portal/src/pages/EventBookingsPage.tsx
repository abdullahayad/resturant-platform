import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type AdminEventItem,
  type AdminEventReservationItem,
  type ReservationStatus,
} from '@/lib/api'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'
import { Pager } from '@/components/Pager'

const PAGE_SIZE = 20

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const reservationStatusTones: Record<ReservationStatus, StatusPillTone> = {
  PENDING: 'muted',
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  COMPLETED: 'success',
}

function formatSchedule(e: AdminEventItem) {
  if (e.isRecurring) {
    const day = e.recurringDayOfWeek != null ? dayNames[e.recurringDayOfWeek] : '—'
    return e.recurringTime ? `Every ${day}, ${e.recurringTime}` : `Every ${day}`
  }
  if (!e.eventDate) return 'Date not set'
  const d = new Date(e.eventDate)
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function BookingsPanel({ eventId }: { eventId: string }) {
  const [reservations, setReservations] = useState<AdminEventReservationItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .adminEventReservations(eventId)
      .then(setReservations)
      .catch(() => setError('Could not load bookings.'))
  }, [eventId])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!reservations) return <p className="text-sm text-muted-foreground">Loading…</p>

  const activeCount = reservations.filter((r) => r.status !== 'CANCELLED').length
  const totalGuests = reservations.filter((r) => r.status !== 'CANCELLED').reduce((sum, r) => sum + r.partySize, 0)

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">
        {activeCount} request{activeCount === 1 ? '' : 's'} · {totalGuests} guest{totalGuests === 1 ? '' : 's'} total
      </p>
      {reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet for this event.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Guest</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Party</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{r.guestName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.guestPhone}</td>
                  <td className="px-3 py-2">{r.partySize}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.reservationDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <StatusPill label={r.status} tone={reservationStatusTones[r.status]} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function EventBookingsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => setPage(1), [debouncedSearch])

  useEffect(() => {
    setLoading(true)
    // Busiest events first — that's the whole point of this page: see at a
    // glance which events are actually generating demand. Search and sort
    // both happen server-side now that this list is paginated.
    api
      .adminEvents(debouncedSearch || undefined, page)
      .then((res) => {
        setEvents(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }, [navigate, debouncedSearch, page])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Event Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Every Chef Table & Events listing across every restaurant, with who's booked into it. Busiest first.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by restaurant or event title…"
        className="w-full max-w-md rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {events.map((e) => {
          const isExpanded = expandedId === e.id
          const count = e._count.reservations
          return (
            <div key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {e.photoUrl ? (
                    <img src={e.photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-xl">
                      {e.eventType.icon ?? '📅'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{e.titleEn}</span>
                      <span className="text-muted-foreground">· {e.titleAr}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.restaurant.nameEn} · {e.restaurant.codeNumber}
                    </div>
                    <div className="mt-1 text-xs font-medium text-primary">{formatSchedule(e)}</div>
                  </div>
                </div>
                <StatusPill
                  label={`${count} booking${count === 1 ? '' : 's'}`}
                  tone={count > 0 ? 'primary' : 'muted'}
                  className="shrink-0"
                />
              </div>

              <button
                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                {isExpanded ? 'Hide bookings' : 'View bookings'}
              </button>

              {isExpanded && <div className="mt-3"><BookingsPanel eventId={e.id} /></div>}
            </div>
          )
        })}
        {!loading && events.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {search ? 'No events match your search.' : 'No events yet.'}
          </div>
        )}
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
