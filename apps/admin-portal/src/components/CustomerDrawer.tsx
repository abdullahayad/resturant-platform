import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, type CustomerBookingStatus, type CustomerDetail } from '@/lib/api'
import { StatusPill, type StatusPillTone } from '@/components/StatusPill'

const bookingTones: Record<CustomerBookingStatus, StatusPillTone> = {
  PENDING: 'primary',
  CONFIRMED: 'success',
  CANCELLED: 'muted',
  COMPLETED: 'muted',
}

const date = (iso: string) => new Date(iso).toLocaleDateString()

// One customer, opened from the Customers list (and from Support): their
// visits, reviews, bookings and follows, plus the account actions.
// onChanged lets the list refresh after a block, delete, etc.
export function CustomerDrawer({
  customerId,
  onClose,
  onChanged,
}: {
  customerId: string
  onClose: () => void
  onChanged?: () => void
}) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const load = () => {
    api
      .customer(customerId)
      .then(setCustomer)
      .catch(() => setError('Could not load this customer.'))
  }
  useEffect(load, [customerId])

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (done) setNotice(done)
      onChanged?.()
    } catch {
      setError('That did not work - please try again.')
    } finally {
      setBusy(false)
    }
  }

  const block = () =>
    run(async () => {
      setCustomer(await api.blockCustomer(customerId, reason))
      setBlocking(false)
      setReason('')
    }, 'Blocked - they were signed out and can no longer sign in.')

  const unblock = () => run(async () => setCustomer(await api.unblockCustomer(customerId)), 'Unblocked.')

  const signOut = () => run(() => api.signOutCustomer(customerId), 'Signed out on every phone.')

  const remove = () => {
    if (!customer) return
    if (!window.confirm(`Delete ${customer.name ?? customer.phone}'s account for good? Their visits and level go too. Reviews stay, without the account link.`)) return
    run(async () => {
      await api.deleteCustomer(customerId)
      onClose()
    })
  }

  const removeVisit = (visitId: string) => {
    if (!window.confirm('Remove this visit? It stops counting toward their level.')) return
    run(async () => {
      await api.removeCustomerVisit(visitId)
      load()
    })
  }

  const toggleReview = (reviewId: string, hidden: boolean) =>
    run(async () => {
      await api.moderateReview(reviewId, hidden ? 'VISIBLE' : 'HIDDEN')
      load()
    })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{customer ? (customer.name ?? 'No name yet') : 'Loading…'}</h2>
            {customer && (
              <p className="text-sm text-muted-foreground">
                {customer.phone} · joined {date(customer.createdAt)} · Level {customer.level}
                {customer.isPublic ? ' · public profile' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-1.5" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        {customer && (
          <>
            {customer.blockedAt && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-semibold text-destructive">Blocked on {date(customer.blockedAt)}</div>
                <div>Reason: {customer.blockedReason}</div>
                {customer.blockedBy && <div className="text-muted-foreground">By {customer.blockedBy.fullName}</div>}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Visits', customer.visitCount],
                ['Reviews', customer.reviewCount],
                ['Following', customer.followCount],
                ['Support', customer.supportTicketCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-secondary py-2">
                  <div className="text-lg font-semibold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {customer.blockedAt ? (
                <button disabled={busy} onClick={unblock} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                  Unblock
                </button>
              ) : blocking ? (
                <div className="flex w-full flex-wrap gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (kept with the block)"
                    className="min-w-[220px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={busy || reason.trim().length < 3}
                    onClick={block}
                    className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                  >
                    Confirm block
                  </button>
                  <button onClick={() => setBlocking(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setBlocking(true)} className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive">
                  Block
                </button>
              )}
              <button disabled={busy} onClick={signOut} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                Sign out everywhere
              </button>
              <button disabled={busy} onClick={remove} className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50">
                Delete account
              </button>
            </div>

            <Section title={`Verified visits (${customer.visitCount})`} empty="No scanned visits.">
              {customer.visits.map((v) => (
                <Row key={v.id} main={v.restaurant.nameEn} sub={v.visitDate}>
                  <button disabled={busy} onClick={() => removeVisit(v.id)} className="text-xs text-destructive disabled:opacity-50">
                    Remove
                  </button>
                </Row>
              ))}
            </Section>

            <Section title={`Reviews written in the app (${customer.reviewCount})`} empty="No reviews.">
              {customer.reviews.map((r) => (
                <Row
                  key={r.id}
                  main={`${'★'.repeat(r.rating)} · ${r.restaurant.nameEn}`}
                  sub={`${date(r.createdAt)}${r.text ? ` · ${r.text}` : ''}`}
                >
                  <button
                    disabled={busy}
                    onClick={() => toggleReview(r.id, r.moderationStatus === 'HIDDEN')}
                    className="text-xs text-primary disabled:opacity-50"
                  >
                    {r.moderationStatus === 'HIDDEN' ? 'Show again' : 'Hide'}
                  </button>
                </Row>
              ))}
            </Section>

            <Section title="Event bookings (by phone number)" empty="No bookings.">
              {customer.bookings.map((b) => (
                <Row key={b.id} main={`${b.event.titleEn} · ${b.restaurant.nameEn}`} sub={`${date(b.reservationDate)} · ${b.partySize} guests`}>
                  <StatusPill label={b.status} tone={bookingTones[b.status]} />
                </Row>
              ))}
            </Section>

            <Section title={`Follows (${customer.followCount})`} empty="Not following anyone.">
              {customer.follows.map((f) => (
                <Row key={f.restaurant.id} main={f.restaurant.nameEn} sub={`since ${date(f.createdAt)}`} />
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">{children}</div>
      )}
    </div>
  )
}

function Row({ main, sub, children }: { main: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm">{main}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {children}
    </div>
  )
}
