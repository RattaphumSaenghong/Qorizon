/**
 * MapView — Mapbox Static Images API
 *
 * Works on web, iOS, and Android with no native SDK required.
 * Renders a real Mapbox map tile as an Image, with React Native
 * overlay elements (pins, badges, etc.) positioned absolutely on top.
 *
 * Upgrade path: swap Image for @rnmapbox/maps when doing the
 * native EAS build to get interactive panning and live trails.
 */
import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
interface PostPin {
  id: string;
  latitude: number;
  longitude: number;
  location: string;
  caption: string;
  hasVideo?: boolean;
  onPress?: () => void;
}

interface MapViewProps {
  initialLongitude?: number;
  initialLatitude?: number;
  initialZoom?: number;
  /** Post pins — used by interactive web map; ignored by static fallback */
  posts?: PostPin[];
  /** Trail coordinates — used by interactive web map */
  trail?: [number, number][];
  style?: object;
  children?: React.ReactNode;
}

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const STYLE = 'mapbox/light-v11';

function buildStaticUrl(
  lon: number,
  lat: number,
  zoom: number,
  widthPx: number,
  heightPx: number,
): string {
  // Static Images API caps at 1280px; retina (@2x) doubles perceived resolution.
  const w = Math.min(Math.round(widthPx), 1280);
  const h = Math.min(Math.round(heightPx), 1280);
  return (
    `https://api.mapbox.com/styles/v1/${STYLE}/static/` +
    `${lon},${lat},${zoom}/${w}x${h}@2x` +
    `?access_token=${TOKEN}&logo=false&attribution=false`
  );
}

export function MapView({
  initialLongitude = 100.5018,
  initialLatitude = 13.7563,
  initialZoom = 11,
  posts: _posts,
  trail: _trail,
  style,
  children,
}: MapViewProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Use a fixed large size so the image looks sharp across all layouts.
  // The container clips it via overflow: hidden.
  const imgW = 1280;
  const imgH = 960;

  const uri = buildStaticUrl(initialLongitude, initialLatitude, initialZoom, imgW, imgH);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        style={styles.map}
        resizeMode="cover"
        // No loading indicator — Mapbox responds quickly
      />
      {/* Overlay layer: pins, badges, etc. passed as children */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

/** Overlay pin — percentage-based position on top of the static map tile. */
export { MapPin } from '../MapPlaceholder';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e9ece3',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
