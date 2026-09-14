import { useCallback, useState } from 'react';
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

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchPage(1)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setPage(1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || items.length >= total) return;
    setLoadingMore(true);
    fetchPage(page + 1)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setPage(res.page);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, page, items.length, total, loadingMore, loading]);

  return { items, setItems, total, page, loading, loadingMore, error, reload, loadMore, hasMore: items.length < total };
}
