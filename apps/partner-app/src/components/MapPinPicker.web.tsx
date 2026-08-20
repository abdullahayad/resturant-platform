import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

const BAGHDAD = { lat: 33.3152, lng: 44.3661 };
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoading: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if ((window as any).L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;

  leafletLoading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.body.appendChild(script);
  });
  return leafletLoading;
}

interface MapPinPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

/** Web pin picker: OpenStreetMap tiles rendered via Leaflet directly in the DOM — no API key needed. */
export function MapPinPicker({ latitude, longitude, onChange }: MapPinPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const containerRef = useRef<View>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled) return;
      const L = (window as any).L;
      const el = containerRef.current as unknown as HTMLElement;
      const start = {
        lat: latitude ?? BAGHDAD.lat,
        lng: longitude ?? BAGHDAD.lng,
      };

      const map = L.map(el, { attributionControl: false }).setView([start.lat, start.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;

      marker.on('dragend', () => {
        const p = marker.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = useCallback(async () => {
    setLocateError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocateError('Location permission denied.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = position.coords;
      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 16);
      }
      onChangeRef.current(lat, lng);
    } catch {
      setLocateError('Could not get your location.');
    } finally {
      setLocating(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View ref={containerRef} style={StyleSheet.absoluteFill} />
      <Pressable style={styles.locateButton} onPress={useMyLocation} disabled={locating}>
        {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.locateIcon}>🎯</Text>}
      </Pressable>
      {locateError && (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>{locateError}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  locateButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  locateIcon: { fontSize: 18 },
  errorBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    right: 60,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  errorText: { color: colors.destructive, fontSize: 11 },
});
