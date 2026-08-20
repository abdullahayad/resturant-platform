import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
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

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html }} onMessage={handleMessage} style={styles.webview} />
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
});
