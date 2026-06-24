export interface ParsedInventory {
  type: 'flight' | 'hotel';
  title: string;
  ref?: string;
  amount_thb?: number;
  origin?: string;
  destination?: string;
  dep_time?: string;
  arr_time?: string;
  hotel_name?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function parseJsonBlocks(html: string): unknown[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap((m) => {
    try {
      return asArray(JSON.parse(m[1].trim()));
    } catch {
      return [];
    }
  });
}

function priceToThb(data: Record<string, any>, thbRate: number): number | undefined {
  const reservation = data.reservationFor;
  const price = Number(data.totalPrice ?? data.price ?? reservation?.totalPrice ?? reservation?.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  const currency = String(data.priceCurrency ?? reservation?.priceCurrency ?? 'USD').toUpperCase();
  return Math.round(currency === 'THB' ? price : price * thbRate);
}

export function parseJsonLd(bodyHtml?: string, thbRate = 36): ParsedInventory | null {
  if (!bodyHtml) return null;
  for (const item of parseJsonBlocks(bodyHtml)) {
    const data = item as Record<string, any>;
    const type = String(data['@type'] ?? data.type ?? '').toLowerCase();
    if (type.includes('flight')) {
      const reservation = data.reservationFor ?? data;
      const flight = Array.isArray(reservation) ? reservation[0] : reservation;
      const origin = flight?.departureAirport?.iataCode ?? flight?.departureAirport?.name;
      const destination = flight?.arrivalAirport?.iataCode ?? flight?.arrivalAirport?.name;
      return {
        type: 'flight',
        title: `${origin ?? 'Flight'} -> ${destination ?? ''}`.trim(),
        ref: data.reservationNumber ?? data.confirmationNumber,
        origin,
        destination,
        dep_time: flight?.departureTime,
        arr_time: flight?.arrivalTime,
        amount_thb: priceToThb(data, thbRate),
      };
    }
    if (type.includes('lodging') || type.includes('hotel')) {
      const reservation = data.reservationFor ?? data;
      return {
        type: 'hotel',
        title: reservation?.name ?? data.name ?? 'Hotel stay',
        ref: data.reservationNumber ?? data.confirmationNumber,
        hotel_name: reservation?.name ?? data.name,
        check_in: data.checkinTime ?? data.checkInTime,
        check_out: data.checkoutTime ?? data.checkOutTime,
        amount_thb: priceToThb(data, thbRate),
      };
    }
  }
  return null;
}
