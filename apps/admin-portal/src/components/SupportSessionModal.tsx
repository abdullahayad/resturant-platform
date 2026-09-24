import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '@/lib/api'

interface SupportSessionModalProps {
  restaurantId: string
  restaurantName: string
  onClose: () => void
}

// The deep-link scheme the partner app registers (see app.json's "scheme").
// The app reads the token from this URL and signs in as the restaurant it
// belongs to - see App.tsx's incoming-link handling.
function supportLinkFor(token: string): string {
  return `ligetapartner://support?token=${encodeURIComponent(token)}`
}

// "Manage as this restaurant" - issues a short-lived login for one
// restaurant and shows it as a QR code to scan with a phone that already
// has the partner app installed. See RestaurantsService.createAdminSupportSession
// for what the token actually grants (full owner-level access, 30 minutes,
// logged for transparency in the Recent Activity feed).
export function SupportSessionModal({ restaurantId, restaurantName, onClose }: SupportSessionModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .createAdminSupportSession(restaurantId)
      .then(async ({ accessToken }) => {
        if (cancelled) return
        const url = supportLinkFor(accessToken)
        setLink(url)
        setQrDataUrl(await QRCode.toDataURL(url, { width: 260, margin: 2 }))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not start a support session')
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Manage as this restaurant</div>
        <h2 className="mt-1 text-lg font-semibold">{restaurantName}</h2>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {!error && !qrDataUrl && <p className="mt-6 text-sm text-muted-foreground">Starting session…</p>}

        {qrDataUrl && (
          <>
            <div className="mt-4 inline-block rounded-xl border border-border bg-white p-3">
              <img src={qrDataUrl} alt="QR code to sign in as this restaurant" width={220} height={220} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Scan with a phone that already has the LiGETA Restaurant app installed. It signs you in as this
              restaurant for 30 minutes — you'll need to sign back into your own account afterward.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Logged for transparency: this session shows up in Recent Activity, tagged with your name.
            </p>
            {link && (
              <div className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-left font-mono text-xs break-all text-muted-foreground">
                {link}
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Close
        </button>
      </div>
    </div>
  )
}
