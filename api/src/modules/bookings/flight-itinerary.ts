import type { FlightSegment, FlightSummary } from '@trailr/shared';

type TripDateWindow = {
  start_date: Date | string | null;
  end_date: Date | string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function segmentRecords(meta: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(meta.segments) ? meta.segments.map(asRecord).filter((s): s is Record<string, unknown> => s !== null) : [];
}

export function extractFlightSummary(meta?: Record<string, unknown> | null): FlightSummary | null {
  if (!meta) return null;
  const segments = segmentRecords(meta);
  const first = segments[0];
  const last = segments[segments.length - 1];
  const origin = stringValue(meta.origin) ?? stringValue(first?.origin) ?? '';
  const destination = stringValue(meta.destination) ?? stringValue(last?.destination) ?? '';
  const depAt = stringValue(meta.dep_at) ?? stringValue(meta.departing_at) ?? stringValue(first?.departing_at);
  const arrAt = stringValue(meta.arr_at) ?? stringValue(meta.arriving_at) ?? stringValue(last?.arriving_at);
  const carrier = stringValue(meta.carrier) ?? stringValue(first?.carrier);
  const carrierName = stringValue(meta.carrier_name) ?? stringValue(first?.carrier_name);
  const flightNumber = stringValue(meta.flight_number) ?? stringValue(first?.flight_number);
  const stops = Math.max(0, Math.round(numberValue(meta.stops) ?? Math.max(0, segments.length - 1)));
  const duration = stringValue(meta.duration);

  if (!origin && !destination && !depAt && !arrAt) return null;
  return {
    origin,
    destination,
    dep_at: depAt,
    arr_at: arrAt,
    carrier,
    carrier_name: carrierName,
    flight_number: flightNumber,
    stops,
    duration,
  };
}

export function flightSegmentsFromMeta(meta?: Record<string, unknown> | null): FlightSegment[] {
  if (!meta) return [];
  return segmentRecords(meta).map((s) => ({
    origin: stringValue(s.origin),
    destination: stringValue(s.destination),
    departing_at: stringValue(s.departing_at),
    arriving_at: stringValue(s.arriving_at),
    carrier: stringValue(s.carrier),
    carrier_name: stringValue(s.carrier_name),
    flight_number: stringValue(s.flight_number),
  }));
}

export function timeFromIso(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:T|\s)(\d{2}:\d{2})/) ?? value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? null;
}

function dateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function flightDepartsOutsideTripWindow(trip: TripDateWindow, depAt?: string | null): boolean {
  const dep = dateKey(depAt);
  const start = dateKey(trip.start_date);
  const end = dateKey(trip.end_date);
  if (!dep || !start || !end) return false;
  return dep < addDays(start, -1) || dep > addDays(end, 1);
}
