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
  onPress?: () => void;
}

interface MapViewProps {
  initialLongitude?: number;
  initialLatitude?: number;
  initialZoom?: number;
  posts?: PostPin[];
  /** GeoJSON trail line coordinates [[lon, lat], ...] */
  trail?: [number, number][];
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
  style,
  children,
}: MapViewProps) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

  useEffect(() => {
    injectCss();

    // Register global callback for popup button
    window.__trailrOpenPost = (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      post?.onPress?.();
    };

    // Dynamic import avoids static Metro resolution issues
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (!containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [initialLongitude, initialLatitude],
        zoom: initialZoom,
        attributionControl: false,
      });

      mapRef.current = map;

      // Navigation controls
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'bottom-right',
      );

      map.on('load', () => {
        // ── Trail line ─────────────────────────────────────────
        if (trail.length >= 2) {
          map.addSource('trail', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: trail },
              properties: {},
            },
          });
          map.addLayer({
            id: 'trail-line',
            type: 'line',
            source: 'trail',
            paint: {
              'line-color': '#e07a5f',
              'line-width': 3,
              'line-dasharray': [2, 3],
              'line-opacity': 0.9,
            },
          });
        }

        // ── Post pins ──────────────────────────────────────────
        posts.forEach((post) => {
          // Custom circular pin element
          const el = document.createElement('div');
          el.style.cssText = `
            width: 44px; height: 44px; border-radius: 50%;
            background: #fbf9f5;
            border: 3px solid #e07a5f;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: transform 0.15s ease;
            overflow: hidden;
            font-size: 18px;
          `;
          el.innerHTML = '📍';
          el.title = post.location;

          el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.15)';
            el.style.zIndex = '10';
          });
          el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            el.style.zIndex = '1';
          });

          const popup = new mapboxgl.Popup({
            closeButton: false,
            offset: 28,
            maxWidth: '240px',
          }).setHTML(buildPopupHtml(post));

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([post.longitude, post.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener('click', () => marker.togglePopup());
          markersRef.current.push(marker);
        });
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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
