import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  UnauthorizedError,
  type LoyaltyGuestLookupResult,
  type LoyaltyTierItem,
  type LoyaltyTierPayload,
} from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'

const emptyForm: LoyaltyTierPayload = { labelEn: '', labelAr: '', thresholdCount: 1, rewardEn: '', rewardAr: '', sortOrder: 0 }

function GuestLookup({ tiers }: { tiers: LoyaltyTierItem[] }) {
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<LoyaltyGuestLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grantTierId, setGrantTierId] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResult(await api.loyaltyGuestLookup(phone.trim()))
    } catch {
      setError('Could not look up that number.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const grant = async () => {
    if (!result || !grantTierId) return
    setBusy(true)
    try {
      await api.grantLoyaltyReward({ guestPhone: result.phone, tierId: grantTierId })
      setResult(await api.loyaltyGuestLookup(result.phone))
      setGrantTierId('')
    } catch {
      setError('Could not grant that reward — it may already be issued to this guest.')
    } finally {
      setBusy(false)
    }
  }

  const redeem = async (id: string) => {
    if (!result) return
    setBusy(true)
    try {
      await api.redeemLoyaltyReward(id)
      setResult(await api.loyaltyGuestLookup(result.phone))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Guest phone number, e.g. 0750 123 4567"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !phone.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Look up'}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">{result.phone}</div>
              <div className="text-xs text-muted-foreground">
                {result.qualifyingBookingCount} confirmed/completed booking{result.qualifyingBookingCount === 1 ? '' : 's'} across{' '}
                {result.restaurantsVisited.length} restaurant{result.restaurantsVisited.length === 1 ? '' : 's'}
              </div>
            </div>
            {result.currentTier ? (
              <StatusPill label={result.currentTier.labelEn} tone="primary" />
            ) : (
              <StatusPill label="No tier yet" tone="muted" />
            )}
          </div>

          {result.restaurantsVisited.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Restaurants visited: </span>
              {result.restaurantsVisited.map((r) => r.nameEn).join(', ')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <select
              value={grantTierId}
              onChange={(e) => setGrantTierId(e.target.value)}
              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Grant a reward…</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.labelEn} — {t.rewardEn}
                </option>
              ))}
            </select>
            <button
              disabled={busy || !grantTierId}
              onClick={grant}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
            >
              Grant
            </button>
          </div>

          <div className="space-y-2">
            {result.rewards.length === 0 && <p className="text-sm text-muted-foreground">No rewards issued yet.</p>}
            {result.rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{r.tierLabelEn} — {r.rewardEn}</div>
                  <div className="text-xs text-muted-foreground">
                    Issued {new Date(r.issuedAt).toLocaleDateString()} at {r.bookingCountAtIssuance} bookings
                    {r.issuedBy ? ` by ${r.issuedBy.fullName}` : ' automatically'}
                  </div>
                </div>
                {r.redeemedAt ? (
                  <StatusPill label="Redeemed" tone="success" />
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => redeem(r.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
                  >
                    Mark redeemed
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TierConfig({ tiers, onChange }: { tiers: LoyaltyTierItem[]; onChange: () => void }) {
  const [form, setForm] = useState<LoyaltyTierPayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (t: LoyaltyTierItem) => {
    setEditingId(t.id)
    setForm({
      labelEn: t.labelEn,
      labelAr: t.labelAr,
      thresholdCount: t.thresholdCount,
      rewardEn: t.rewardEn,
      rewardAr: t.rewardAr,
      sortOrder: t.sortOrder,
    })
  }

  const submit = async () => {
    setError(null)
    try {
      if (editingId) {
        await api.updateLoyaltyTier(editingId, form)
      } else {
        await api.createLoyaltyTier(form)
      }
      resetForm()
      onChange()
    } catch {
      setError('Save failed.')
    }
  }

  const toggleActive = async (t: LoyaltyTierItem) => {
    await api.updateLoyaltyTier(t.id, { isActive: !t.isActive })
    onChange()
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold text-primary">{editingId ? 'Edit tier' : 'Add tier'}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={form.labelEn}
            onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
            placeholder="Tier name (English), e.g. Gold"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.labelAr}
            onChange={(e) => setForm((f) => ({ ...f, labelAr: e.target.value }))}
            placeholder="Tier name (Arabic)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            min={1}
            value={form.thresholdCount}
            onChange={(e) => setForm((f) => ({ ...f, thresholdCount: Number(e.target.value) }))}
            placeholder="Bookings required"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            placeholder="Sort order"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.rewardEn}
            onChange={(e) => setForm((f) => ({ ...f, rewardEn: e.target.value }))}
            placeholder="Reward text (English), e.g. 10% off next visit"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
          />
          <input
            value={form.rewardAr}
            onChange={(e) => setForm((f) => ({ ...f, rewardAr: e.target.value }))}
            placeholder="Reward text (Arabic)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            disabled={!form.labelEn.trim() || !form.labelAr.trim() || !form.rewardEn.trim() || !form.rewardAr.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {editingId ? 'Save Changes' : 'Add'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Threshold</th>
              <th className="px-4 py-2 font-medium">Reward</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{t.labelEn} · {t.labelAr}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.thresholdCount} bookings</td>
                <td className="px-4 py-2">{t.rewardEn}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(t)}
                    className={
                      t.isActive
                        ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs text-success'
                        : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground'
                    }
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => startEdit(t)} className="text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {tiers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No tiers configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function LoyaltyPage() {
  const navigate = useNavigate()
  const [tiers, setTiers] = useState<LoyaltyTierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .loyaltyTiers()
      .then(setTiers)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Loyalty & Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Guests are tracked platform-wide by phone number across Chef Table & Events bookings. Look up a
          number to see their history, or configure the tiers that unlock automatically.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Guest lookup</h2>
            <GuestLookup tiers={tiers} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Tier configuration</h2>
            <TierConfig tiers={tiers} onChange={load} />
          </section>
        </>
      )}
    </div>
  )
}
