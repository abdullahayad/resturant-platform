import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

// Whether LiGETA has approved and published this restaurant. New
// restaurants set up everything right away, but customer-facing actions
// (scanning visits, Featured requests) wait for this. null while loading.
export function useIsPublished(): boolean | null {
  const { token } = useAuth();
  const [published, setPublished] = useState<boolean | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .me(token)
      .then((r) => {
        if (!cancelled) setPublished(r.publishStatus === 'APPROVED');
      })
      .catch(() => {
        if (!cancelled) setPublished(true); // unknown: let the server decide
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return published;
}
