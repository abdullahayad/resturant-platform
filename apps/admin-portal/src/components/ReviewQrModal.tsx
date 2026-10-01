import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ROOT_URL } from '@/lib/api'

interface ReviewQrModalProps {
  restaurantId: string
  restaurantName: string
  onClose: () => void
}

// Unlike SupportSessionModal's QR, this link is permanent (no token, no
// expiry) - it's meant to be printed once and sit on a restaurant's tables
// indefinitely, so it's built straight from the restaurant's id with no
// backend call needed first.
function reviewLinkFor(restaurantId: string): string {
  return `${ROOT_URL}/review/${restaurantId}`
}

export function ReviewQrModal({ restaurantId, restaurantName, onClose }: ReviewQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const link = reviewLinkFor(restaurantId)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(link, { width: 260, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [link])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Table Review QR Code</div>
        <h2 className="mt-1 text-lg font-semibold">{restaurantName}</h2>

        {!qrDataUrl && <p className="mt-6 text-sm text-muted-foreground">Generating…</p>}

        {qrDataUrl && (
          <>
            <div className="mt-4 inline-block rounded-xl border border-border bg-white p-3">
              <img src={qrDataUrl} alt="QR code linking to this restaurant's customer review page" width={220} height={220} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Print this on a table-tent or sticker. A customer scans it with their phone's regular camera — no app
              install, no account — and can leave a star rating and comment in under a minute.
            </p>
            <div className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-left font-mono text-xs break-all text-muted-foreground">
              {link}
            </div>
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
