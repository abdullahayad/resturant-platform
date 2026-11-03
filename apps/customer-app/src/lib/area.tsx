import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const AREA_KEY = 'ligeta.area';

// The area chosen on Home ("بغداد · المنصور"): a whole province, or one
// district in it. Explore narrows its results to it. Remembered on the
// phone - it's a preference, not account data.
export interface Area {
  provinceId: string;
  districtId?: string;
  provinceNameAr: string;
  provinceNameEn: string;
  districtNameAr?: string;
  districtNameEn?: string;
}

interface AreaState {
  area: Area | null;
  setArea: (area: Area | null) => void;
}

const AreaContext = createContext<AreaState | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const [area, setAreaState] = useState<Area | null>(null);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(AREA_KEY)
      .then((saved) => {
        if (!cancelled && saved) setAreaState(JSON.parse(saved) as Area);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AreaState>(
    () => ({
      area,
      setArea: (next) => {
        setAreaState(next);
        (next ? SecureStore.setItemAsync(AREA_KEY, JSON.stringify(next)) : SecureStore.deleteItemAsync(AREA_KEY)).catch(
          () => {},
        );
      },
    }),
    [area],
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea(): AreaState {
  const state = useContext(AreaContext);
  if (!state) throw new Error('useArea must be used inside AreaProvider');
  return state;
}
