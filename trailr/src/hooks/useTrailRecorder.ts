/**
 * Live GPS trail recorder (Strava-style breadcrumb capture).
 *
 * Foreground only: watches the device position while recording, buffers points,
 * and batch-POSTs them to the trip's trail. Works on web (localhost/HTTPS) and
 * native foreground. Background tracking needs a native EAS build + task config.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { postTrailPoints, setLiveMode, liveKeys } from '@trailr/db';
import type { TrailPointInput } from '@trailr/db';

const BATCH_SIZE = 5; // flush after this many points…
const FLUSH_MS = 15000; // …or at least this often

export interface TrailRecorder {
  isRecording: boolean;
  pointCount: number; // points successfully sent this session
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useTrailRecorder(tripId: string): TrailRecorder {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const bufferRef = useRef<TrailPointInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (!tripId || bufferRef.current.length === 0) return;
    const batch = bufferRef.current;
    bufferRef.current = [];
    try {
      await postTrailPoints(tripId, batch);
      setPointCount((n) => n + batch.length);
      // Grow the trail line on the map live.
      queryClient.invalidateQueries({ queryKey: liveKeys.trail(tripId) });
    } catch (e) {
      bufferRef.current = [...batch, ...bufferRef.current]; // retry next flush
      setError(String(e));
    }
  }, [tripId, queryClient]);

  const start = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied');
      return;
    }
    setLiveMode(tripId, true).catch(() => undefined); // best-effort feed gate

    subRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
      (loc) => {
        bufferRef.current.push({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude ?? undefined,
          recorded_at: new Date(loc.timestamp).toISOString(),
        });
        if (bufferRef.current.length >= BATCH_SIZE) flush();
      },
    );
    timerRef.current = setInterval(flush, FLUSH_MS);
    setIsRecording(true);
  }, [tripId, flush]);

  const stop = useCallback(async () => {
    subRef.current?.remove();
    subRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await flush(); // send whatever's left
    setLiveMode(tripId, false).catch(() => undefined);
    setIsRecording(false);
  }, [tripId, flush]);

  // Stop watching if the screen unmounts mid-recording.
  useEffect(() => {
    return () => {
      subRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { isRecording, pointCount, error, start, stop };
}
