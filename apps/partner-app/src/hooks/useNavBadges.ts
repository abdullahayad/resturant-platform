import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { getReviewsLastSeen, setReviewsLastSeen } from '../lib/reviewsSeen/storage';
import type { ScreenKey } from '../lib/nav';

/** New reviews since the restaurant last opened the Reviews screen. There's no
 * server-side "unread" concept for reviews (unlike announcements), so this is
 * tracked locally. The very first time this runs there's no baseline yet — treat
 * that as "caught up" rather than flooding a fresh install with every historical
 * review as "new". */
async function countNewReviews(token: string): Promise<number> {
  const [reviews, lastSeen] = await Promise.all([
    api.myReviews(token).catch(() => []),
    getReviewsLastSeen(),
  ]);
  if (lastSeen === null) {
    await setReviewsLastSeen(new Date().toISOString());
    return 0;
  }
  const since = new Date(lastSeen).getTime();
  return reviews.filter((r) => new Date(r.createdAt).getTime() > since).length;
}

// Debounces the refetch below — switching quickly through several tabs
// while exploring the app used to fire 5 API calls per tap; waiting for the
// user to actually settle on a screen before fetching cuts that down to one
// round of calls per visit instead of one per tap.
const REFETCH_DEBOUNCE_MS = 400;

/** Small unread/pending counts shown on nav items — refetched (after a short
 * debounce) whenever the active screen changes, so a badge clears once its
 * section has been viewed and acted on (e.g. announcements marked read,
 * reservations confirmed). */
export function useNavBadges(active: ScreenKey): Partial<Record<ScreenKey, number>> {
  const { token } = useAuth();
  const [badges, setBadges] = useState<Partial<Record<ScreenKey, number>>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      Promise.all([
        api.announcements(token).then((list) => list.filter((a) => !a.readAt).length).catch(() => 0),
        api.myReservations(token).then((list) => list.filter((r) => r.status === 'PENDING').length).catch(() => 0),
        countNewReviews(token).catch(() => 0),
        api.myPromotions(token).then((list) => list.filter((p) => p.status === 'REJECTED').length).catch(() => 0),
        // Publish review declined and not yet dismissed — shown in the
        // Publish Review section of the Announcements screen. Unlike the
        // unread-announcements count above, this does NOT clear just by
        // opening the screen, only via the explicit "Mark as Done" action.
        api.me(token).then((r) => (r.publishStatus === 'REJECTED' && !r.publishDeclineAcknowledgedAt ? 1 : 0)).catch(() => 0),
      ]).then(([unreadAnnouncements, pendingReservations, reviews, promotions, unacknowledgedPublishDecline]) => {
        if (cancelled) return;
        setBadges({ announcements: unreadAnnouncements + unacknowledgedPublishDecline, reservations: pendingReservations, reviews, promotions });
      });
    }, REFETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token, active]);

  return badges;
}
