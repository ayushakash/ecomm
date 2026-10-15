import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Button, Icon, Screen, ScreenHeader, SearchBar, Text } from '../../components/ui';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { RootStackScreenProps } from '../../navigation/types';
import { reverseGeocode, searchPlaces } from '../../services/geocoding';
import { colors, radii, shadows, spacing, SCREEN_PADDING } from '../../theme';
import type { Coordinates, GeocodedPlace, PlaceSuggestion } from '../../types/models';
import { toast } from '../../utils/toast';

/** India centre, as on web MapComponent when no position is known. */
const INDIA_CENTER: Coordinates = { latitude: 20.5937, longitude: 78.9629 };

const buildHtml = (start: Coordinates, zoom: number) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${start.latitude}, ${start.longitude}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var marker = L.marker([${start.latitude}, ${start.longitude}], { draggable: true }).addTo(map);
  function post(ll) { window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ll.lat, lng: ll.lng })); }
  marker.on('dragend', function () { post(marker.getLatLng()); });
  map.on('click', function (e) { marker.setLatLng(e.latlng); post(e.latlng); });
  window.setPin = function (lat, lng, z) { var ll = L.latLng(lat, lng); marker.setLatLng(ll); map.setView(ll, z || map.getZoom()); post(ll); };
</script></body></html>`;

const placeLabel = (p: GeocodedPlace) =>
  [p.area, p.city, p.state, p.pincode].filter(Boolean).join(', ') || p.formattedAddress;

export default function MapPickerScreen({ navigation, route }: RootStackScreenProps<'MapPicker'>) {
  const { t } = useTranslation('location');
  const { returnTo, initial } = route.params;
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const [pos, setPos] = useState<Coordinates | null>(initial ?? null);
  const [place, setPlace] = useState<GeocodedPlace | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const debouncedQuery = useDebouncedValue(query, 500);
  const debouncedPos = useDebouncedValue(pos, 700);

  // HTML is built once; later moves go through setPin.
  const html = useMemo(() => buildHtml(initial ?? INDIA_CENTER, initial ? 16 : 5), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPin = (c: Coordinates, zoom = 16) =>
    webRef.current?.injectJavaScript(`window.setPin(${c.latitude}, ${c.longitude}, ${zoom}); true;`);

  const locate = async (silent = false) => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) toast.error(t('map.permissionDenied'), t('map.tapInstead'));
        return;
      }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPin({ latitude: p.coords.latitude, longitude: p.coords.longitude });
    } catch {
      if (!silent) toast.error(t('map.locateFailed'), t('map.tapInstead'));
    } finally {
      setLocating(false);
    }
  };

  // Like web: centre on the user when no initial position is given.
  const onMapLoad = () => {
    if (!initial) void locate(true);
  };

  // Reverse geocode the pin for the preview (debounced to respect Nominatim's rate limit).
  useEffect(() => {
    if (!debouncedPos) return;
    let alive = true;
    setGeocoding(true);
    reverseGeocode(debouncedPos).then((p) => {
      if (!alive) return;
      setPlace(p);
      setGeocoding(false);
    });
    return () => {
      alive = false;
    };
  }, [debouncedPos]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setResults([]);
      return;
    }
    let alive = true;
    // Bias suggestions toward where the pin is (backend defaults to Ranchi).
    searchPlaces(debouncedQuery, pos ?? undefined).then((r) => alive && setResults(r));
    return () => {
      alive = false;
    };
  }, [debouncedQuery]);

  const onMessage = (e: WebViewMessageEvent) => {
    const data: unknown = JSON.parse(e.nativeEvent.data);
    if (data && typeof data === 'object' && 'lat' in data && 'lng' in data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      setPlace(null);
      setPos({ latitude: data.lat, longitude: data.lng });
    }
  };

  const confirm = async () => {
    if (!pos) return;
    setConfirming(true);
    const resolved = place && debouncedPos === pos ? place : await reverseGeocode(pos);
    setConfirming(false);
    const pickedLocation: GeocodedPlace = { ...(resolved ?? {}), coordinates: pos };
    navigation.navigate(returnTo, { pickedLocation }, { merge: true });
  };

  const preview = !pos
    ? t('map.hint')
    : geocoding || pos !== debouncedPos
      ? t('map.fetching')
      : place
        ? placeLabel(place) || t('map.locationSelected')
        : `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`;

  return (
    <Screen>
      <ScreenHeader title={t('map.title')} backIcon="close" compact />
      <View style={styles.flex}>
        <WebView
          ref={webRef}
          source={{ html }}
          originWhitelist={['*']}
          onMessage={onMessage}
          onLoadEnd={onMapLoad}
          javaScriptEnabled
          style={styles.flex}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        />

        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('map.searchPlaceholder')} />
          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((r, i) => (
                <Pressable
                  key={`${r.coordinates.latitude},${r.coordinates.longitude},${i}`}
                  style={styles.resultRow}
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    setResults([]);
                    setQuery('');
                    setPin(r.coordinates);
                  }}
                >
                  <Icon name="location-outline" size={18} color="textSecondary" />
                  <View style={styles.flex}>
                    <Text variant="bodySm" weight="bold" numberOfLines={1}>
                      {r.title}
                    </Text>
                    {!!r.subtitle && (
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {r.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={styles.locateBtn}
          onPress={() => locate()}
          accessibilityRole="button"
          accessibilityLabel={t('picker.useCurrent')}
        >
          {locating ? <ActivityIndicator color={colors.primary} /> : <Icon name="locate" size={22} color="primary" />}
        </Pressable>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.previewRow}>
          <Icon name="location" size={22} color="secondaryDark" />
          <View style={styles.flex}>
            <Text variant="caption" color="textMuted">
              {t('map.selected')}
            </Text>
            <Text variant="body" weight="semibold" numberOfLines={2}>
              {preview}
            </Text>
          </View>
        </View>
        <Button
          title={t('map.confirm')}
          variant="secondary"
          size="lg"
          fullWidth
          leftIcon="checkmark"
          disabled={!pos}
          loading={confirming}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  searchWrap: { position: 'absolute', top: spacing.md, left: SCREEN_PADDING, right: SCREEN_PADDING, gap: spacing.xs },
  results: { backgroundColor: colors.surface, borderRadius: radii.md, overflow: 'hidden', ...shadows.md },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  locateBtn: {
    position: 'absolute',
    right: SCREEN_PADDING,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.lg,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
