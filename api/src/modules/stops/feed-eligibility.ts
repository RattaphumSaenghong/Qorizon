// Pure logic for deciding whether a visited stop may appear in the feed.
// No Nest deps so the seed script can reuse it.

export const NEAR_TRAIL_METERS = 1000; // a post must be within 1km of the trail
export const EDIT_GRACE_DAYS = 14; // you can still post/edit for 2 weeks after a trip

export interface TrailPoint {
  latitude: number;
  longitude: number;
}

export interface EligibilityInput {
  status: string;
  latitude: number | null;
  longitude: number | null;
  startDate: Date | null;
  endDate: Date | null;
  liveMode: boolean;
  accountType: string; // 'personal' | 'business'
  trail: TrailPoint[];
  now: Date;
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Feed-eligible iff:
 *  - business account (bypasses everything), OR
 *  - status visited AND temporally in-window AND spatially near the trail.
 *
 * Fallbacks (live-trail not always present yet):
 *  - no trail recorded, or stop has no coords → skip the spatial check.
 *  - no dates AND not live → not eligible (neither live nor dated travel).
 */
export function computeFeedEligible(i: EligibilityInput): boolean {
  if (i.accountType === 'business') return true;
  if (i.status !== 'visited') return false;

  // ── temporal ──
  let temporalOk = i.liveMode;
  if (!temporalOk && i.endDate) {
    const graceEnd = addDays(i.endDate, EDIT_GRACE_DAYS);
    const afterStart = !i.startDate || i.now >= i.startDate;
    temporalOk = i.now <= graceEnd && afterStart;
  }
  if (!temporalOk) return false;

  // ── spatial ── (only enforce when we can actually verify location)
  const canGeoCheck = i.trail.length > 0 && i.latitude != null && i.longitude != null;
  if (canGeoCheck) {
    const near = i.trail.some(
      (tp) => distanceMeters(i.latitude as number, i.longitude as number, tp.latitude, tp.longitude) <= NEAR_TRAIL_METERS,
    );
    if (!near) return false;
  }

  return true;
}
