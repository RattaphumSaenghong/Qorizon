import { request } from '../http';
import type {
  LiveBatchRow,
  LiveCadence,
  TrailPointRow,
  TrailPointInput,
  TripRow,
} from '../types';

/** Toggle live mode on a trip (owner). */
export async function setLiveMode(
  tripId: string,
  liveMode: boolean,
  cadence?: LiveCadence,
): Promise<TripRow> {
  return request<TripRow>('PATCH', `/trips/${tripId}/live-mode`, {
    live_mode: liveMode,
    ...(cadence ? { live_cadence: cadence } : {}),
  });
}

/** Append GPS trail points (owner). */
export async function postTrailPoints(
  tripId: string,
  points: TrailPointInput[],
): Promise<{ inserted: number }> {
  return request<{ inserted: number }>('POST', `/trips/${tripId}/trail`, { points });
}

/** Read a trip's GPS trail (ordered). */
export async function fetchTrail(tripId: string): Promise<TrailPointRow[]> {
  return request<TrailPointRow[]>('GET', `/trips/${tripId}/trail`);
}

/** Publish a live batch (owner) — groups stops + notifies followers. */
export async function publishBatch(
  tripId: string,
  opts: { batch_date?: string; title?: string; stop_ids?: string[] } = {},
): Promise<LiveBatchRow> {
  return request<LiveBatchRow>('POST', `/trips/${tripId}/batches`, opts);
}

/** List a trip's live batches. */
export async function fetchBatches(tripId: string): Promise<LiveBatchRow[]> {
  return request<LiveBatchRow[]>('GET', `/trips/${tripId}/batches`);
}
