import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TILESET = 'mapbox.mapbox-streets-v8';
const STATION_RADIUS_M = 1500; // how far from a hotel we'll look for a station
// High enough that real `station` nodes aren't crowded out by dense `entrance` rows
// at big interchanges (verified against Shinjuku: 33 entrances vs 2 stations in range).
const QUERY_LIMIT = 50;

// Rail-like `mode` values on the transit_stop_label layer — buses excluded.
// Verified live against Mapbox Streets v8 (returns rail / metro_rail / bus near Shinjuku).
const RAIL_MODES = new Set(['rail', 'metro_rail', 'light_rail', 'monorail']);

export interface NearestStation {
  name?: string;
  meters: number;
}

interface TileFeature {
  properties?: {
    name?: string;
    mode?: string;
    stop_type?: string;
    maki?: string;
    tilequery?: { distance?: number };
  };
}

/** Nearest rail/metro station lookup via the Mapbox Tilequery API.
 *  Disabled (returns null) when MAPBOX_TOKEN is unset. */
@Injectable()
export class MapboxService {
  private readonly logger = new Logger(MapboxService.name);
  private readonly cache = new Map<string, NearestStation | null>();

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return !!this.config.get<string>('MAPBOX_TOKEN');
  }

  async nearestStation(latitude: number, longitude: number): Promise<NearestStation | null> {
    const token = this.config.get<string>('MAPBOX_TOKEN');
    if (!token) return null;

    // Stations don't move — cache on coords rounded to ~11m precision.
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = await this.fetchNearest(latitude, longitude, token);
    this.cache.set(key, result);
    return result;
  }

  private async fetchNearest(
    latitude: number,
    longitude: number,
    token: string,
  ): Promise<NearestStation | null> {
    const params = new URLSearchParams({
      radius: String(STATION_RADIUS_M),
      limit: String(QUERY_LIMIT),
      layers: 'transit_stop_label',
      access_token: token,
    });
    const url = `https://api.mapbox.com/v4/${TILESET}/tilequery/${longitude},${latitude}.json?${params}`;

    let features: TileFeature[];
    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`Tilequery failed: ${res.status}`);
        return null;
      }
      const body = (await res.json()) as { features?: TileFeature[] };
      features = body.features ?? [];
    } catch (e) {
      this.logger.warn(`Tilequery error: ${(e as Error).message}`);
      return null;
    }

    // Prefer the nearest `station` node — it carries the real station name.
    // Entrances are closer but named like "Exit 3", so they're only a distance
    // fallback (so a transit-led hotel still scores when no station node is in range).
    let station: NearestStation | null = null;
    let anyRailMeters: number | null = null;
    for (const f of features) {
      const p = f.properties;
      if (!p?.mode || !RAIL_MODES.has(p.mode)) continue;
      const meters = p.tilequery?.distance;
      if (typeof meters !== 'number') continue;

      if (anyRailMeters == null || meters < anyRailMeters) anyRailMeters = meters;
      if (p.stop_type === 'station' && (!station || meters < station.meters)) {
        station = { name: p.name, meters: Math.round(meters) };
      }
    }
    if (station) return station;
    if (anyRailMeters != null) return { meters: Math.round(anyRailMeters) }; // name → "a station"
    return null;
  }
}
