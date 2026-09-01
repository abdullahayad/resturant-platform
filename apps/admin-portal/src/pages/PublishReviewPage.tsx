import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, UnauthorizedError, type ModerationStatus, type PublishReviewDetail, type PublishStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const publishStatusStyles: Record<PublishStatus, string> = {
  NOT_SUBMITTED: 'bg-secondary text-muted-foreground',
  PENDING: 'bg-primary/15 text-primary',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/15 text-destructive',
}

const moderationStyles: Record<ModerationStatus, string> = {
  VISIBLE: 'bg-success/15 text-success',
  FLAGGED: 'bg-primary/15 text-primary',
  HIDDEN: 'bg-destructive/15 text-destructive',
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const staffRoleLabels: Record<'MANAGER' | 'MENU_EDITOR', string> = {
  MANAGER: 'Manager',
  MENU_EDITOR: 'Menu Editor',
}

function ModerationPill({ status }: { status: ModerationStatus }) {
  if (status === 'VISIBLE') return null
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px]', moderationStyles[status])}>{status}</span>
}

export function PublishReviewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<PublishReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const load = () => {
    if (!id) return
    setLoading(true)
    api
      .publishReview(id)
      .then(setDetail)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const approve = async () => {
    if (!id) return
    setBusy(true)
    try {
      await api.moderatePublish(id, 'APPROVED')
      load()
    } finally {
      setBusy(false)
    }
  }

  const confirmReject = async () => {
    if (!id) return
    setBusy(true)
    try {
      await api.moderatePublish(id, 'REJECTED', rejectionReason || undefined)
      setRejecting(false)
      setRejectionReason('')
      load()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!detail) return null

  const activeStaff = detail.staffUsers.filter((s) => s.isActive)

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/approvals')}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Approvals
      </button>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">
              {detail.nameEn} <span className="text-muted-foreground">· {detail.nameAr}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{detail.codeNumber} · {detail.phone}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn('rounded-full px-2.5 py-1 text-xs', publishStatusStyles[detail.publishStatus])}>
              {detail.publishStatus.replace('_', ' ')}
            </span>
            {detail.publishSubmittedAt && (
              <span className="text-xs text-muted-foreground">
                Submitted {new Date(detail.publishSubmittedAt).toLocaleString()}
              </span>
            )}
            {detail.publishReviewedBy && detail.publishReviewedAt && (
              <span className="text-xs text-muted-foreground">
                Reviewed by {detail.publishReviewedBy.fullName} on {new Date(detail.publishReviewedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {detail.publishStatus === 'REJECTED' && detail.publishRejectionReason && (
          <p className="mt-3 text-sm text-destructive">Decline reason: {detail.publishRejectionReason}</p>
        )}

        {detail.publishStatus === 'PENDING' && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {rejecting ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Decline reason (optional)"
                  className="min-w-[240px] flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button
                  disabled={busy}
                  onClick={confirmReject}
                  className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                >
                  Confirm Decline
                </button>
                <button
                  onClick={() => { setRejecting(false); setRejectionReason('') }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={approve}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Approve — Go Live
                </button>
                <button
                  disabled={busy}
                  onClick={() => setRejecting(true)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {detail.publishStatus === 'REJECTED' && (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            The restaurant can update their profile and submit again on their own — no action needed here.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Profile</h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Owner email</div>
            <div>{detail.ownerEmail}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Location</div>
            <div>
              {detail.province?.nameEn ?? '—'}
              {detail.district ? `, ${detail.district.nameEn}` : ''}
              {detail.latitude != null && detail.longitude != null ? ` (${detail.latitude}, ${detail.longitude})` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Business Types</div>
            <div>{detail.businessTypes.map((b) => b.businessType.nameEn).join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Food Categories</div>
            <div>{detail.foodCategories.map((f) => f.foodCategory.nameEn).join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Facilities</div>
            <div>{detail.facilities.map((f) => f.facility.nameEn).join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Crew</div>
            <div>{detail.crewCount != null ? `${detail.crewCount} staff` : '—'}</div>
          </div>
        </div>

        {detail.openingHours.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-xs text-muted-foreground">Opening Hours</div>
            <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              {detail.openingHours.map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                  <span>{dayNames[h.dayOfWeek]}</span>
                  <span className="text-muted-foreground">
                    {h.isClosed ? 'Closed' : `${h.openTime ?? '—'} – ${h.closeTime ?? '—'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Staff ({activeStaff.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Read-only — staff accounts are managed by the restaurant's own owner/manager.
        </p>
        {activeStaff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active staff.</p>
        ) : (
          <div className="space-y-2">
            {activeStaff.map((s) => (
              <div key={s.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="font-medium">{s.fullName}</div>
                <div className="text-xs text-muted-foreground">{s.email} · {staffRoleLabels[s.role]}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Menu ({detail.dishes.length})</h2>
        {detail.dishes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dishes added yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.dishes.map((d) => (
              <div key={d.id} className="flex gap-3 rounded-lg border border-border p-3">
                {d.photoUrl ? (
                  <img src={d.photoUrl} alt={d.nameEn} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-secondary" />
                )}
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{d.nameEn} <span className="text-muted-foreground">· {d.nameAr}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {d.menuCategory?.nameEn ?? 'Uncategorized'} · {Number(d.price).toLocaleString()} IQD
                    </div>
                  </div>
                  <ModerationPill status={d.moderationStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Gallery ({detail.galleryPhotos.length})</h2>
        {detail.galleryPhotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos added yet.</p>
        ) : (
          ['FOOD', 'MENU', 'AMBIENCE'].map((album) => {
            const photos = detail.galleryPhotos.filter((p) => p.album === album)
            if (photos.length === 0) return null
            return (
              <div key={album} className="mb-4 last:mb-0">
                <div className="mb-2 text-xs text-muted-foreground">{album}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {photos.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <img src={p.url} alt={p.caption ?? ''} className="aspect-square w-full rounded-lg object-cover" />
                      <ModerationPill status={p.moderationStatus} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Chefs</h2>
        {detail.chefProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chef profiles added yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detail.chefProfiles.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="font-medium">{c.name} <span className="text-muted-foreground">· {c.role.replace('_', ' ')}</span></div>
                <div className="text-xs text-muted-foreground">
                  {c.speciality ?? '—'}{c.yearsExperience != null ? ` · ${c.yearsExperience} yrs` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Events ({detail.events.length})</h2>
        {detail.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events added yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detail.events.map((e) => (
              <div key={e.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{e.titleEn} <span className="text-muted-foreground">· {e.titleAr}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {e.eventType.nameEn}{e.price != null ? ` · ${Number(e.price).toLocaleString()} IQD` : ''}
                    </div>
                  </div>
                  <ModerationPill status={e.moderationStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
