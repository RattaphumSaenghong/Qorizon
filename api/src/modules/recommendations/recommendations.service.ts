import { Inject, Injectable } from '@nestjs/common';
import type { HotelRecommendation, HotelRecommendationsResponse, TransportMode } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { HOTEL_PROVIDER, type HotelProviderApi } from '../bookings/providers/booking-provider';
import { MapboxService, type NearestStation } from '../maps/mapbox.service';

// Tunables — see DESIGN_hotel_recs.md §3.5.
const SPREAD_THRESHOLD_KM = 25; // beyond this, one hotel can't serve the trip (multi-area)
const ATTR_MAX_KM = 5; // avg distance to sights at/above which attractionScore hits 0
const STATION_MAX_M = 1500; // station distance at/above which transitScore hits 0
const RATING_MAX = 10; // provider review-score scale (LiteAPI/mock ~0–10)
const LODGING_FRACTION = 0.35; // share of total budget assumed to go to lodging
const DEFAULT_NIGHTS = 3;
const TOP_N = 5;

// Transport modes for which station proximity matters.
const TRANSIT_MODES: ReadonlySet<TransportMode> = new Set(['train', 'transit', 'mixed']);

// Base weights; when transit is inactive, wT folds into attractions.
const W = { attraction: 0.4, budget: 0.25, rating: 0.1, transit: 0.25 };

interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RecommendationParams {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  nightlyCap?: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly mapbox: MapboxService,
    @Inject(HOTEL_PROVIDER) private readonly hotels: HotelProviderApi,
  ) {}

  async recommendHotels(
    userId: string,
    tripId: string,
    params: RecommendationParams,
  ): Promise<HotelRecommendationsResponse> {
    await this.policy.assertCanReadTrip(userId, tripId);

    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: { destination: true, budget: true, start_date: true, end_date: true, transport_mode: true },
    });

    // Attraction stops only — exclude logistics, require coordinates.
    const stops = await this.prisma.stop.findMany({
      where: {
        trip_id: tripId,
        category: { notIn: ['hotel', 'flight', 'transport'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { latitude: true, longitude: true },
    });
    const points = stops
      .filter((s): s is { latitude: number; longitude: number } => s.latitude != null && s.longitude != null)
      .map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

    const nights = resolveNights(params.checkIn, params.checkOut, trip.start_date, trip.end_date);
    const nightlyCap = resolveNightlyCap(params.nightlyCap, trip.budget, nights);

    // Need at least two coordinates to triangulate a meaningful anchor.
    if (points.length < 2) {
      return { multi_area: false, anchor: null, nights, nightly_cap_thb: nightlyCap, items: [] };
    }

    if (maxPairwiseKm(points) > SPREAD_THRESHOLD_KM) {
      return { multi_area: true, anchor: medoid(points), nights, nightly_cap_thb: nightlyCap, items: [] };
    }

    const anchor = medoid(points);
    const checkIn = params.checkIn ?? toYmd(trip.start_date);
    const offers = await this.hotels.searchHotels({
      city: trip.destination ?? undefined,
      check_in: checkIn,
      nights,
    });

    // Transit scoring only kicks in for transit-led trips with Mapbox configured.
    const transitActive =
      this.mapbox.enabled && TRANSIT_MODES.has(trip.transport_mode as TransportMode);

    const candidates = offers.filter((o) => o.latitude != null && o.longitude != null);
    const stations = await Promise.all(
      candidates.map((o) =>
        transitActive ? this.mapbox.nearestStation(o.latitude!, o.longitude!) : Promise.resolve(null),
      ),
    );

    const items = candidates
      .map((o, i) => {
        const hotel: GeoPoint = { latitude: o.latitude!, longitude: o.longitude! };
        const avgKm = avg(points.map((p) => haversineKm(hotel, p)));
        const nightly = readNightly(o.meta, o.amount_thb, nights);
        const rating = o.rating ?? null;
        const station = stations[i];

        const score = scoreHotel({ avgKm, nightly, nightlyCap, rating, transitActive, station });
        return {
          offer_id: o.id,
          provider: o.provider,
          name: o.title,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          nightly_thb: nightly,
          total_thb: nightly * nights,
          rating,
          score,
          avg_km_to_stops: round(avgKm, 2),
          ...(station ? { station_name: station.name, station_meters: station.meters } : {}),
          why: buildWhy(avgKm, points.length, nightly, nightlyCap, rating, station),
        } satisfies HotelRecommendation;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);

    return { multi_area: false, anchor, nights, nightly_cap_thb: nightlyCap, items };
  }
}

// ── scoring ───────────────────────────────────────────────────────────────

function scoreHotel(args: {
  avgKm: number;
  nightly: number;
  nightlyCap: number | null;
  rating: number | null;
  transitActive: boolean;
  station: NearestStation | null;
}): number {
  const attraction = clamp01(1 - args.avgKm / ATTR_MAX_KM);
  const budget = budgetScore(args.nightly, args.nightlyCap);
  const rating = args.rating != null ? clamp01(args.rating / RATING_MAX) : 0.5;

  if (!args.transitActive) {
    // Transit off (mode is car/walk, or Mapbox unconfigured): fold wT into attractions.
    const score = (W.attraction + W.transit) * attraction + W.budget * budget + W.rating * rating;
    return round(score, 4);
  }

  // No station within range scores 0 on transit — bad for a transit-led traveller.
  const transit = args.station ? clamp01(1 - args.station.meters / STATION_MAX_M) : 0;
  const score =
    W.attraction * attraction + W.budget * budget + W.rating * rating + W.transit * transit;
  return round(score, 4);
}

/** 1 at/under cap, decaying to 0 at 2× cap. Neutral (1) when no budget is set. */
function budgetScore(nightly: number, cap: number | null): number {
  if (cap == null || cap <= 0) return 1;
  if (nightly <= cap) return 1;
  return clamp01(1 - (nightly - cap) / cap);
}

function buildWhy(
  avgKm: number,
  stopCount: number,
  nightly: number,
  cap: number | null,
  rating: number | null,
  station: NearestStation | null,
): string {
  const parts = [`avg ${round(avgKm, 1)} km to your ${stopCount} sights`];
  if (station) {
    const where = station.name ? ` to ${station.name}` : ' to a station';
    parts.push(`${station.meters} m${where}`);
  }
  const budgetTag = cap == null ? '' : nightly <= cap ? ', under budget' : ', over budget';
  parts.push(`฿${nightly.toLocaleString('en-US')}/night${budgetTag}`);
  if (rating != null) parts.push(`★${rating}`);
  return parts.join(' · ');
}

// ── geometry ────────────────────────────────────────────────────────────────

/** The point with the smallest summed distance to all others — a real attraction,
 *  unlike a centroid which can land between clusters (in a river / the sea). */
function medoid(points: GeoPoint[]): GeoPoint {
  let best = points[0];
  let bestSum = Infinity;
  for (const a of points) {
    const sum = points.reduce((acc, b) => acc + haversineKm(a, b), 0);
    if (sum < bestSum) {
      bestSum = sum;
      best = a;
    }
  }
  return { latitude: best.latitude, longitude: best.longitude };
}

function maxPairwiseKm(points: GeoPoint[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, haversineKm(points[i], points[j]));
    }
  }
  return max;
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

// ── budget / dates ───────────────────────────────────────────────────────────

function resolveNights(
  checkIn?: string,
  checkOut?: string,
  start?: Date | null,
  end?: Date | null,
): number {
  const from = checkIn ?? toYmd(start);
  const to = checkOut ?? toYmd(end);
  if (from && to) {
    const diff = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
    if (diff >= 1) return diff;
  }
  return DEFAULT_NIGHTS;
}

function resolveNightlyCap(override: number | undefined, budget: number | null, nights: number): number | null {
  if (override != null && override > 0) return override;
  if (budget != null && budget > 0) return Math.round((budget * LODGING_FRACTION) / nights);
  return null;
}

function readNightly(meta: Record<string, unknown> | undefined, totalThb: number, nights: number): number {
  const fromMeta = meta?.['nightly'];
  if (typeof fromMeta === 'number' && fromMeta > 0) return fromMeta;
  return Math.round(totalThb / Math.max(1, nights));
}

// ── misc ──────────────────────────────────────────────────────────────────────

function toYmd(d: Date | null | undefined): string | undefined {
  return d ? d.toISOString().slice(0, 10) : undefined;
}
const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const round = (x: number, dp: number): number => Number(x.toFixed(dp));
