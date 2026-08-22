import { useEffect, useState } from 'react';
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

/** Small unread/pending counts shown on nav items — refetched whenever the
 * active screen changes so a badge clears once its section has been viewed
 * and acted on (e.g. announcements marked read, reservations confirmed). */
export function useNavBadges(active: ScreenKey): Partial<Record<ScreenKey, number>> {
  const { token } = useAuth();
  const [badges, setBadges] = useState<Partial<Record<ScreenKey, number>>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.announcements(token).then((list) => list.filter((a) => !a.readAt).length).catch(() => 0),
      api.myReservations(token).then((list) => list.filter((r) => r.status === 'PENDING').length).catch(() => 0),
      countNewReviews(token).catch(() => 0),
      api.myPromotions(token).then((list) => list.filter((p) => p.status === 'REJECTED').length).catch(() => 0),
    ]).then(([announcements, chefTable, reviews, promotions]) => {
      if (cancelled) return;
      setBadges({ announcements, chefTable, reviews, promotions });
    });
    return () => {
      cancelled = true;
    };
  }, [token, active]);

  return badges;
}
