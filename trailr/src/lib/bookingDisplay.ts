import type { BookingOffer, FlightSegment, FlightSummary } from '@trailr/db';

export function moneyThb(amount?: number | null): string {
  return amount == null ? 'Price unavailable' : `${amount.toLocaleString()} THB`;
}

export function nightlyThb(amount?: number | null, nights?: unknown): string | null {
  const parsedNights = Number(nights ?? 0);
  if (amount == null || !Number.isFinite(parsedNights) || parsedNights <= 0) return null;
  return `${Math.round(amount / parsedNights).toLocaleString()} THB/night`;
}

export function offerNightlyThb(offer?: BookingOffer): string | null {
  return nightlyThb(offer?.amount_thb, offer?.meta?.['nights']);
}

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

export function formatDuration(value?: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return durationFromMinutes(Math.round(value));
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const iso = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (iso) {
    const hours = Number(iso[1] ?? 0);
    const minutes = Number(iso[2] ?? 0);
    return durationFromMinutes(hours * 60 + minutes);
  }
  return value;
}

export function flightSummaryFromMeta(meta?: Record<string, unknown> | FlightSummary | null): FlightSummary | null {
  if (!meta) return null;
  const record = meta as Record<string, unknown>;
  const records = segmentRecords(record);
  const first = records[0];
  const last = records[records.length - 1];
  const origin = stringValue(record.origin) ?? stringValue(first?.origin) ?? '';
  const destination = stringValue(record.destination) ?? stringValue(last?.destination) ?? '';
  const depAt = stringValue(record.dep_at) ?? stringValue(record.departing_at) ?? stringValue(first?.departing_at);
  const arrAt = stringValue(record.arr_at) ?? stringValue(record.arriving_at) ?? stringValue(last?.arriving_at);
  const carrier = stringValue(record.carrier) ?? stringValue(first?.carrier);
  const carrierName = stringValue(record.carrier_name) ?? stringValue(first?.carrier_name);
  const flightNumber = stringValue(record.flight_number) ?? stringValue(first?.flight_number);
  const stops = Math.max(0, Math.round(numberValue(record.stops) ?? Math.max(0, records.length - 1)));

  if (!origin && !destination && !depAt && !arrAt) return null;
  return { origin, destination, dep_at: depAt, arr_at: arrAt, carrier, carrier_name: carrierName, flight_number: flightNumber, stops };
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

export function flightRowLine(meta?: Record<string, unknown> | FlightSummary | null): string | null {
  const summary = flightSummaryFromMeta(meta);
  if (!summary) return null;
  const dep = timeFromIso(summary.dep_at);
  const arr = timeFromIso(summary.arr_at);
  const route = `${summary.origin || 'Flight'}${dep ? ` ${dep}` : ''} -> ${summary.destination || 'Destination'}${arr ? ` ${arr}` : ''}`;
  const duration = durationBetween(summary.dep_at, summary.arr_at) ?? formatDuration((meta as Record<string, unknown> | null)?.duration);
  const stops = summary.stops === 0 ? 'non-stop' : `${summary.stops} stop${summary.stops === 1 ? '' : 's'}`;
  return [route, duration, stops].filter(Boolean).join(' - ');
}

export function flightSegmentLine(segment: FlightSegment): string {
  const dep = timeFromIso(segment.departing_at);
  const arr = timeFromIso(segment.arriving_at);
  const route = `${segment.origin ?? 'Flight'}${dep ? ` ${dep}` : ''} -> ${segment.destination ?? 'Destination'}${arr ? ` ${arr}` : ''}`;
  const carrier = [segment.carrier, segment.flight_number].filter(Boolean).join(' ');
  return [route, carrier || segment.carrier_name].filter(Boolean).join(' - ');
}

function timeFromIso(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:T|\s)(\d{2}:\d{2})/) ?? value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? null;
}

function durationBetween(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return durationFromMinutes(Math.round(diff / 60000));
}

function durationFromMinutes(totalMinutes: number): string | null {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
