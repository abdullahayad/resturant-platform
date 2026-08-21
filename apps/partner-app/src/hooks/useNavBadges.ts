import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import type { ScreenKey } from '../lib/nav';

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
    ]).then(([announcements, chefTable]) => {
      if (cancelled) return;
      setBadges({ announcements, chefTable });
    });
    return () => {
      cancelled = true;
    };
  }, [token, active]);

  return badges;
}
