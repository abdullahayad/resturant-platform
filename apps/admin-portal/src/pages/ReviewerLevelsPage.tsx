import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type CriticAdminItem, type CustomerLevels, type LevelCustomer } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { Switch } from '@/components/Switch'
import { CustomerDrawer } from '@/components/CustomerDrawer'

const levelNames = ['New taster', 'Explorer', 'Taster', 'Critic', 'LiGETA Star']

// Customer levels, from verified visits only (a restaurant scanned the
// customer's visit code - never GPS, never self-reported). The thresholds
// live in the backend (customers/customer-levels.ts); following public
// A critic is a customer with a public profile at Level 4+, or one an
// admin made a LiGETA Star; customers can follow critics in the app.
export function ReviewerLevelsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<CustomerLevels | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [critics, setCritics] = useState<CriticAdminItem[] | null>(null)

  const loadCritics = () => {
    api.critics().then(setCritics).catch(() => setError('Could not load critics.'))
  }
  useEffect(loadCritics, [])

  const toggleStar = async (c: CriticAdminItem) => {
    await api.setCustomerStar(c.id, !c.isStar).catch(() => setError('Could not save.'))
    loadCritics()
  }

  const toggleHidden = async (c: CriticAdminItem) => {
    if (!c.criticHidden && !window.confirm(`Remove ${c.name ?? c.phone}'s critic status? They stay a normal customer.`)) return
    await api.setCriticHidden(c.id, !c.criticHidden).catch(() => setError('Could not save.'))
    loadCritics()
  }

  useEffect(() => {
    api
      .customerLevels()
      .then(setData)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
  }, [navigate])

  const max = data ? Math.max(1, ...data.distribution.map((d) => d.customers)) : 1

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Levels &amp; Critics</h1>
        <p className="text-sm text-muted-foreground">
          Customers level up with verified visits - each time a restaurant scans their visit code (once per restaurant
          per day).
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-semibold">Customers per level</div>
            {data.distribution.map((d) => (
              <div key={d.level} className="flex items-center gap-3 text-sm">
                <div className="w-44 shrink-0">
                  <span className="font-semibold">Level {d.level}</span>{' '}
                  <span className="text-muted-foreground">· {levelNames[d.level - 1]}</span>
                  <div className="text-xs text-muted-foreground">from {d.fromVisits} visits</div>
                </div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(d.customers / max) * 100}%` }} />
                </div>
                <div className="w-12 shrink-0 text-right font-semibold">{d.customers}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PeopleList
              title="Most active customers"
              hint="By verified visits."
              people={data.topCustomers}
              empty="No scanned visits yet."
              onOpen={setOpenId}
            />
            <PeopleList
              title="Close to the next level"
              hint="2 visits or fewer away - worth a look before someone reaches Critic and can go public."
              people={data.nearNextLevel}
              empty="Nobody is close yet."
              onOpen={setOpenId}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-sm font-semibold">Critics</div>
            <div className="text-xs text-muted-foreground">
              Customers with a public profile. They show as critics (followable in the app) from Level 4, or right away
              as a LiGETA Star. Removing the status keeps them as a normal customer - turning Public back on won't undo it.
            </div>
            {critics === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {critics?.length === 0 && <p className="text-sm text-muted-foreground">Nobody has a public profile yet.</p>}
            {critics && critics.length > 0 && (
              <div className="divide-y divide-border">
                {critics.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <button onClick={() => setOpenId(c.id)} className="min-w-0 flex-1 text-left hover:text-primary">
                      <div className="font-medium">{c.name ?? c.phone}</div>
                      <div className="text-xs text-muted-foreground">
                        Level {c.level} · {c.visitCount} visits · {c.reviewCount} reviews · {c.followerCount} followers
                      </div>
                    </button>
                    {c.isCritic ? (
                      <StatusPill label="Critic" tone="success" />
                    ) : c.criticHidden ? (
                      <StatusPill label="Status removed" tone="destructive" />
                    ) : c.blockedAt ? (
                      <StatusPill label="Blocked" tone="destructive" />
                    ) : (
                      <StatusPill label={c.isPublic ? 'Not Level 4 yet' : 'Private'} tone="muted" />
                    )}
                    <Switch checked={c.isStar} onChange={() => toggleStar(c)} label="⭐ LiGETA Star" />
                    <button
                      onClick={() => toggleHidden(c)}
                      className={
                        c.criticHidden
                          ? 'rounded-lg border border-border px-3 py-1 text-xs'
                          : 'rounded-lg border border-destructive px-3 py-1 text-xs text-destructive'
                      }
                    >
                      {c.criticHidden ? 'Give status back' : 'Remove critic status'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {openId && <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function PeopleList({
  title,
  hint,
  people,
  empty,
  onOpen,
}: {
  title: string
  hint: string
  people: LevelCustomer[]
  empty: string
  onOpen: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mb-2 text-xs text-muted-foreground">{hint}</div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"
            >
              <span>
                {p.name ?? p.phone}
                {p.isPublic && <span className="ml-2 text-xs text-success">public</span>}
              </span>
              <span className="shrink-0 text-muted-foreground">
                Level {p.level} · {p.visitCount} visits
                {p.nextLevelAt ? ` · ${p.nextLevelAt - p.visitCount} to go` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
