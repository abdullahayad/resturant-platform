import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await api.login(email, password)
      if ('twoFactorRequired' in result) {
        setPendingToken(result.pendingToken)
        return
      }
      auth.setAdmin(result.admin)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!pendingToken) return
    setError(null)
    setSubmitting(true)
    try {
      const { admin } = await api.completeTwoFactor(pendingToken, code)
      auth.setAdmin(admin)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <form onSubmit={submitCode} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-primary"
              placeholder="000000"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingToken(null)
              setCode('')
              setError(null)
            }}
            className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary shadow-[var(--shadow-glow)]">
            <UtensilsCrossed className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage the platform.</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="admin@platform.iq"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
