import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';

const AREA_KEY = 'ligeta.area';
const NEAR_ME_KEY = 'ligeta.nearMe';

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

export interface Point {
  lat: number;
  lng: number;
}

interface AreaState {
  area: Area | null;
  setArea: (area: Area | null) => void;
  // "My location" / Near me: results sorted by distance from the phone.
  // Only the choice is remembered; the position itself is read fresh each
  // time the app opens, and only while it's open.
  nearMe: boolean;
  point: Point | null;
  locating: boolean;
  setNearMe: (on: boolean) => Promise<boolean>;
}

const AreaContext = createContext<AreaState | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [area, setAreaState] = useState<Area | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const busy = useRef(false);

  // Reads the position. With ask=false (app start) it never shows a
  // permission prompt or an error - it just stays off if it can't.
  const locate = useCallback(
    async (ask: boolean): Promise<Point | null> => {
      if (busy.current) return null;
      busy.current = true;
      setLocating(true);
      try {
        const permission = ask
          ? await Location.requestForegroundPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          if (ask) {
            Alert.alert(t('explore.locationTitle'), t('explore.locationText'), [
              { text: t('profile.cancel'), style: 'cancel' },
              { text: t('explore.openSettings'), onPress: () => Linking.openSettings() },
            ]);
          }
          return null;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPoint(here);
        return here;
      } catch {
        if (ask) Alert.alert(t('explore.locationTitle'), t('explore.locationFailed'));
        return null;
      } finally {
        busy.current = false;
        setLocating(false);
      }
    },
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(AREA_KEY)
      .then((saved) => {
        if (!cancelled && saved) setAreaState(JSON.parse(saved) as Area);
      })
      .catch(() => {});
    SecureStore.getItemAsync(NEAR_ME_KEY)
      .then((saved) => {
        if (!cancelled && saved === '1') void locate(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locate]);

  const value = useMemo<AreaState>(
    () => ({
      area,
      setArea: (next) => {
        setAreaState(next);
        (next ? SecureStore.setItemAsync(AREA_KEY, JSON.stringify(next)) : SecureStore.deleteItemAsync(AREA_KEY)).catch(
          () => {},
        );
      },
      nearMe: !!point,
      point,
      locating,
      setNearMe: async (on) => {
        if (!on) {
          setPoint(null);
          SecureStore.deleteItemAsync(NEAR_ME_KEY).catch(() => {});
          return true;
        }
        const here = await locate(true);
        if (here) SecureStore.setItemAsync(NEAR_ME_KEY, '1').catch(() => {});
        return !!here;
      },
    }),
    [area, point, locating, locate],
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea(): AreaState {
  const state = useContext(AreaContext);
  if (!state) throw new Error('useArea must be used inside AreaProvider');
  return state;
}
