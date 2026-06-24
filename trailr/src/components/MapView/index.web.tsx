// @ts-nocheck
/**
 * Interactive web map — mapbox-gl directly.
 * Pan, zoom, real post pins at GPS coordinates.
 *
 * Uses a dynamic import + DOM ref so Metro doesn't need to
 * statically resolve mapbox-gl at bundle time.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const STYLE_URL = 'mapbox://styles/mapbox/light-v11';
const CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';

export interface PostPin {
  id: string;
  latitude: number;
  longitude: number;
  location: string;
  caption: string;
  hasVideo?: boolean;
  photoUrl?: string;
  /** 1-based order label, drawn inside the pin (builder route sequence). */
  index?: number;
  markerKind?: 'visited' | 'planned';
  onPress?: () => void;
}

interface MapViewProps {
  initialLongitude?: number;
  initialLatitude?: number;
  initialZoom?: number;
  posts?: PostPin[];
  /** Recorded GPS trail [[lon, lat], ...] — drawn as a solid line. */
  trail?: [number, number][];
  /** Planned stop-to-stop connector [[lon, lat], ...] — drawn as a dashed line. */
  route?: [number, number][];
  /** Highlighted pin id — rendered enlarged with its photo, and panned to. */
  activeId?: string | null;
  /** When provided, clicking a pin selects it (id) instead of opening a popup. */
  onSelectPost?: (id: string) => void;
  /** Fires when the pointer enters/leaves a pin. */
  onHoverPost?: (id: string | null) => void;
  /** Fires with the visible map bounds on load and after every pan/zoom. */
  onBoundsChange?: (b: { west: number; south: number; east: number; north: number }) => void;
  /** Recenter target — the map eases here whenever this changes (after mount). */
  center?: { latitude: number; longitude: number } | null;
  /** Fires with the coordinate when the user taps the map (builder: drop a stop). */
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  style?: object;
  children?: React.ReactNode;
}

function injectCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mapbox-gl-css')) return;
  const link = document.createElement('link');
  link.id = 'mapbox-gl-css';
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  document.head.appendChild(link);
}

export function MapView({
  initialLongitude = 100.5018,
  initialLatitude = 13.7563,
  initialZoom = 11,
  posts = [],
  trail = [],
  route = [],
  activeId = null,
  onSelectPost,
  onHoverPost,
  onBoundsChange,
  center = null,
  onMapPress,
  style,
  children,
}: MapViewProps) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const mapboxglRef = useRef(null);
  const loadedRef = useRef(false);
  const resizeObsRef = useRef(null);
  // Keep latest posts reachable from the one-time map-load handler & popup callback.
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const onMapPressRef = useRef(onMapPress);
  onMapPressRef.current = onMapPress;

  const buildPopupHtml = (post: PostPin) => `
    <div style="
      font-family: -apple-system, sans-serif;
      width: 220px;
      padding: 0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    ">
      <div style="
        height: 130px;
        background: #f3efe7;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <span style="font-size: 11px; color: #9b958a; font-family: monospace;">[ photo ]</span>
        ${post.hasVideo ? `
          <div style="
            position: absolute; top: 8px; right: 8px;
            background: rgba(44,42,38,0.65);
            border-radius: 12px; padding: 3px 8px;
            font-size: 11px; color: white;
          ">▶ video</div>
        ` : ''}
      </div>
      <div style="padding: 10px 12px; background: #fbf9f5;">
        <div style="
          display: inline-flex; align-items: center; gap: 5px;
          background: #e07a5f; border-radius: 20px;
          padding: 3px 10px; margin-bottom: 6px;
        ">
          <div style="width:6px;height:6px;border-radius:3px;background:#fff;"></div>
          <span style="font-size: 12px; color: white; font-weight: 600;">${post.location}</span>
        </div>
        <p style="
          margin: 0; font-size: 12px; color: #2c2a26;
          line-height: 1.5; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        ">${post.caption}</p>
        <button onclick="window.__trailrOpenPost('${post.id}')" style="
          margin-top: 10px; width: 100%;
          background: #e07a5f; color: white;
          border: none; border-radius: 20px;
          padding: 7px; font-size: 12px;
          font-weight: 600; cursor: pointer;
        ">View full trip →</button>
      </div>
    </div>
  `;

  // Render markers for the *current* posts. Safe to call repeatedly — it
  // clears existing markers first. No-ops until the map has loaded.
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;
    if (!map || !mapboxgl || !loadedRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    posts.forEach((post) => {
      const isActive = post.id === activeId;

      // Outer element is positioned by Mapbox (it writes a translate transform
      // here) — never set our own transform on it, or the pin jumps to 0,0.
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.title = post.location;
      el.style.zIndex = isActive ? '20' : '1';

      // Inner visual carries the hover scale, so it doesn't clobber positioning.
      const size = isActive ? 60 : 40;
      const inner = document.createElement('div');
      const isPlanned = post.markerKind === 'planned';
      inner.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${isPlanned ? '#d6d2c9' : '#fbf9f5'};
        border: ${isActive ? 4 : 3}px ${isPlanned ? 'dashed' : 'solid'} ${isPlanned ? '#9b958a' : '#e07a5f'};
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,${isPlanned ? 0.10 : isActive ? 0.35 : 0.2});
        transition: transform 0.15s ease;
        overflow: hidden;
        font-size: 18px;
        color: ${isPlanned ? '#6f6b62' : '#e07a5f'};
      `;
      // Active pin shows its photo; numbered pins show their order; else 📍.
      if (!isPlanned && post.photoUrl) {
        inner.style.backgroundImage = `url('${post.photoUrl}')`;
        inner.style.backgroundSize = 'cover';
        inner.style.backgroundPosition = 'center';
      } else if (post.index != null) {
        inner.innerHTML = `<span style="font-weight:800;font-size:${isActive ? 22 : 16}px;color:#e07a5f;">${post.index}</span>`;
      } else if (isPlanned) {
        inner.innerHTML = '<span style="font-weight:800;font-size:18px;">&#8982;</span>';
      } else {
        inner.innerHTML = '📍';
      }
      el.appendChild(inner);

      el.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.35)';
        if (!isActive) el.style.zIndex = '10';
        onHoverPost?.(post.id);
      });
      el.addEventListener('mouseleave', () => {
        inner.style.transform = 'scale(1)';
        if (!isActive) el.style.zIndex = '1';
        onHoverPost?.(null);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([post.longitude, post.latitude])
        .addTo(map);

      // Selection mode (journal) vs. popup mode (feed).
      if (onSelectPost) {
        el.addEventListener('click', () => onSelectPost(post.id));
      } else {
        const popup = new mapboxgl.Popup({
          closeButton: false,
          offset: 28,
          maxWidth: '240px',
        }).setHTML(buildPopupHtml(post));
        marker.setPopup(popup);
        el.addEventListener('click', () => marker.togglePopup());
      }
      markersRef.current.push(marker);
    });

    // Keep the highlighted pin in view.
    if (activeId) {
      const active = posts.find((p) => p.id === activeId);
      if (active) map.easeTo({ center: [active.longitude, active.latitude], duration: 500 });
    }
  }, [posts, activeId, onSelectPost, onHoverPost]);

  // Latest syncMarkers, callable from the one-time map-load handler.
  const syncRef = useRef(null);
  syncRef.current = syncMarkers;

  // Draw/update line layers. Idempotent: updates the source if it exists, else
  // creates source + layer. Reactive so async-arriving trail data still renders.
  const syncLines = useCallback(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const lines: Array<{ id: string; coords: [number, number][]; dashed: boolean }> = [
      { id: 'trail', coords: trail, dashed: false }, // recorded GPS path
      { id: 'route', coords: route, dashed: true },  // planned stop connector
    ];

    for (const { id, coords, dashed } of lines) {
      const data = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {},
      };
      const src = map.getSource(id);
      if (src) {
        src.setData(coords.length >= 2 ? data : { type: 'FeatureCollection', features: [] });
        continue;
      }
      if (coords.length < 2) continue;
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({
        id: `${id}-line`,
        type: 'line',
        source: id,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#e07a5f',
          'line-width': dashed ? 2 : 3.5,
          'line-opacity': dashed ? 0.55 : 0.95,
          ...(dashed ? { 'line-dasharray': [1.5, 2.5] } : {}),
        },
      });
    }
  }, [trail, route]);

  const syncLinesRef = useRef(null);
  syncLinesRef.current = syncLines;

  // Create the map exactly once.
  useEffect(() => {
    injectCss();

    // Popup "View full trip" button → latest posts via ref.
    window.__trailrOpenPost = (postId: string) => {
      const post = postsRef.current.find((p) => p.id === postId);
      post?.onPress?.();
    };

    // Dynamic import avoids static Metro resolution issues
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (!containerRef.current || mapRef.current) return;

      mapboxglRef.current = mapboxgl;
      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [initialLongitude, initialLatitude],
        zoom: initialZoom,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'bottom-right',
      );

      // Resize the GL canvas when the container changes size (collapse split,
      // sheet drag, window resize). mapbox's own trackResize misses flex/width
      // changes, leaving the map rendered at its old width with blank space.
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        const ro = new ResizeObserver(() => mapRef.current && mapRef.current.resize());
        ro.observe(containerRef.current);
        resizeObsRef.current = ro;
      }

      // Report the visible bounds (for the "On-map" feed filter) on load + pan/zoom.
      const emitBounds = () => {
        const cb = onBoundsChangeRef.current;
        if (!cb || !mapRef.current) return;
        const b = mapRef.current.getBounds();
        cb({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
      };
      map.on('moveend', emitBounds);

      // Tap-to-place (builder).
      map.on('click', (e: any) => {
        onMapPressRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      });

      map.on('load', () => {
        loadedRef.current = true;
        syncLinesRef.current?.(); // trail + route lines
        syncRef.current?.();      // post pins
        emitBounds();             // initial viewport
      });
    });

    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      loadedRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers whenever posts change — data usually arrives AFTER the
  // map has initialised, which is why one-time rendering left the map empty.
  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  // Same for line layers (recorded trail + planned route).
  useEffect(() => {
    syncLines();
  }, [syncLines]);

  // Pan to a new center when it changes (e.g. selecting a post on Explore).
  useEffect(() => {
    if (!center || !mapRef.current || !loadedRef.current) return;
    mapRef.current.easeTo({ center: [center.longitude, center.latitude], duration: 500 });
  }, [center?.latitude, center?.longitude]);

  return (
    <View style={[styles.container, style]}>
      {/* Mapbox renders into this div */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* React Native overlay children (badges, etc.) */}
      {children && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      )}
    </View>
  );
}

// Re-export overlay pin for screens that still use it
export { MapPin } from '../MapPlaceholder';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e9ece3',
  },
});
