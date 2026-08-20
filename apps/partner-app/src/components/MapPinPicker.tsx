import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';

const BAGHDAD = { lat: 33.3152, lng: 44.3661 };

interface MapPinPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

function buildHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:${colors.secondary};}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { attributionControl: false }).setView([${lat}, ${lng}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  function send(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
  }
  function moveTo(lat, lng, zoom) {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], zoom || map.getZoom());
  }
  marker.on('dragend', function () {
    var p = marker.getLatLng();
    send(p.lat, p.lng);
  });
  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    send(e.latlng.lat, e.latlng.lng);
  });
</script>
</body>
</html>`;
}

/** Native (iOS/Android) pin picker: OpenStreetMap tiles rendered inside a WebView — no API key needed. */
export function MapPinPicker({ latitude, longitude, onChange }: MapPinPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const initial = useRef({
    lat: latitude ?? BAGHDAD.lat,
    lng: longitude ?? BAGHDAD.lng,
  }).current;
  const html = useMemo(() => buildHtml(initial.lat, initial.lng), [initial.lat, initial.lng]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const { lat, lng } = JSON.parse(event.nativeEvent.data);
        onChange(lat, lng);
      } catch {
        // ignore malformed bridge messages
      }
    },
    [onChange],
  );

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
      webViewRef.current?.injectJavaScript(`moveTo(${lat}, ${lng}, 16); true;`);
      onChange(lat, lng);
    } catch {
      setLocateError('Could not get your location.');
    } finally {
      setLocating(false);
    }
  }, [onChange]);

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} originWhitelist={['*']} source={{ html }} onMessage={handleMessage} style={styles.webview} />
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

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webview: { flex: 1, backgroundColor: colors.secondary },
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
