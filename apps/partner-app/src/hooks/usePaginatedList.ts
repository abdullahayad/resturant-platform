import { useCallback, useRef, useState } from 'react';
import type { Paginated } from '../lib/api';

/** Shared infinite-scroll plumbing for a FlatList backed by a paginated
 * endpoint - fetches one page at a time, appends on loadMore, and tracks
 * whether more pages remain. `fetchPage` should be memoized (useCallback)
 * by the caller with whatever filters it depends on, and the caller drives
 * the initial/refetch-on-filter-change load itself via
 * `useEffect(() => { reload() }, [reload])` so this hook stays agnostic to
 * what each screen's filters actually are. */
export function usePaginatedList<T>(fetchPage: (page: number) => Promise<Paginated<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Neither request below cancels the other's in-flight fetch, so a
  // loadMore() for a filter the caller has since changed away from (via a
  // fresh reload()) can still resolve afterward and land stale rows on top
  // of the new, already-reset list. Each call stamps itself with the
  // current generation before awaiting anything, and only applies its
  // result if that's still the newest call by the time it resolves -
  // whichever request was started last always wins, regardless of which
  // one's response happens to arrive last.
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    fetchPage(1)
      .then((res) => {
        if (requestIdRef.current !== requestId) return;
        setItems(res.items);
        setTotal(res.total);
        setPage(1);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setError(true);
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || items.length >= total) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    fetchPage(page + 1)
      .then((res) => {
        if (requestIdRef.current !== requestId) return;
        setItems((prev) => [...prev, ...res.items]);
        setPage(res.page);
      })
      .catch(() => {})
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoadingMore(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, page, items.length, total, loadingMore, loading]);

  return { items, setItems, total, page, loading, loadingMore, error, reload, loadMore, hasMore: items.length < total };
}
