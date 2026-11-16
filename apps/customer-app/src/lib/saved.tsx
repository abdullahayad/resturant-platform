import { File, Paths } from 'expo-file-system';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { RestaurantPage } from './api';

// Saved restaurants live on the phone, not the server: no account needed,
// and each one keeps a full copy of its page so it opens even offline.
// The copy is refreshed whenever the customer opens the restaurant online.
interface SavedEntry {
  id: string;
  savedAt: string;
  page: RestaurantPage;
}

interface SavedState {
  items: SavedEntry[];
  isSaved: (id: string) => boolean;
  toggle: (page: RestaurantPage) => void;
  remove: (id: string) => void;
  // Keeps a saved restaurant's offline copy current; does nothing for
  // restaurants that aren't saved.
  refresh: (page: RestaurantPage) => void;
  offlineCopy: (id: string) => RestaurantPage | null;
}

const SavedContext = createContext<SavedState | null>(null);

function savedFile() {
  return new File(Paths.document, 'saved-restaurants.json');
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const file = savedFile();
        if (file.exists) {
          const data = JSON.parse(await file.text()) as { items?: SavedEntry[] };
          if (Array.isArray(data.items)) setItems(data.items);
        }
      } catch {
        // A damaged file just means an empty list.
      } finally {
        loaded.current = true;
      }
    })();
  }, []);

  const persist = useCallback((next: SavedEntry[]) => {
    try {
      savedFile().write(JSON.stringify({ items: next }));
    } catch {
      // Storage full or unavailable - the list still works for this session.
    }
  }, []);

  const update = useCallback(
    (change: (prev: SavedEntry[]) => SavedEntry[]) => {
      setItems((prev) => {
        const next = change(prev);
        if (next !== prev && loaded.current) persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<SavedState>(
    () => ({
      items,
      isSaved: (id) => items.some((e) => e.id === id),
      toggle: (page) =>
        update((prev) =>
          prev.some((e) => e.id === page.id)
            ? prev.filter((e) => e.id !== page.id)
            : [{ id: page.id, savedAt: new Date().toISOString(), page }, ...prev],
        ),
      remove: (id) => update((prev) => prev.filter((e) => e.id !== id)),
      refresh: (page) =>
        update((prev) => (prev.some((e) => e.id === page.id) ? prev.map((e) => (e.id === page.id ? { ...e, page } : e)) : prev)),
      offlineCopy: (id) => items.find((e) => e.id === id)?.page ?? null,
    }),
    [items, update],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedState {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside SavedProvider');
  return ctx;
}
