import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

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
  const containerRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    let map: any;
    let marker: any;

    loadLeaflet().then(() => {
      if (cancelled) return;
      const L = (window as any).L;
      const el = containerRef.current as unknown as HTMLElement;
      const start = {
        lat: latitude ?? BAGHDAD.lat,
        lng: longitude ?? BAGHDAD.lng,
      };

      map = L.map(el, { attributionControl: false }).setView([start.lat, start.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);

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
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
});
