import { ConfigService } from '@nestjs/config';
import type { BookingOffer } from '@trailr/shared';
import type { BookingProviderApi, FlightSearch, HotelSearch } from './booking-provider';

/**
 * Amadeus flight search (real). Uses the free test API. Selected when
 * AMADEUS_CLIENT_ID/SECRET are set; otherwise the Mock provider is used.
 * Hotels are not wired here yet (Agoda/Booking.com are the intended hotel
 * providers) — falls back to an empty list with a note.
 */
export class AmadeusBookingProvider implements BookingProviderApi {
  readonly name = 'amadeus';
  private readonly base = 'https://test.api.amadeus.com';
  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  private get thbRate(): number {
    return Number(this.config.get('AMADEUS_THB_RATE') ?? 38);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const res = await fetch(`${this.base}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.get<string>('AMADEUS_CLIENT_ID')!,
        client_secret: this.config.get<string>('AMADEUS_CLIENT_SECRET')!,
      }),
    });
    if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  async searchFlights(p: FlightSearch): Promise<BookingOffer[]> {
    const token = await this.accessToken();
    const q = new URLSearchParams({
      originLocationCode: p.origin ?? 'BKK',
      destinationLocationCode: p.destination ?? 'NRT',
      departureDate: p.depart_date ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      adults: '1',
      max: '3',
    });
    const res = await fetch(`${this.base}/v2/shopping/flight-offers?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Amadeus flight search failed: ${res.status}`);
    const data = (await res.json()) as { data: any[] };

    return (data.data ?? []).map((offer, i) => {
      const seg = offer.itineraries?.[0]?.segments ?? [];
      const stops = Math.max(0, seg.length - 1);
      const price = Number(offer.price?.grandTotal ?? offer.price?.total ?? 0);
      return {
        id: `amadeus-${offer.id ?? i}`,
        type: 'flight' as const,
        provider: 'amadeus' as const,
        title: `${p.origin ?? 'BKK'} → ${p.destination ?? 'NRT'}`,
        subtitle: `${seg[0]?.carrierCode ?? ''} · ${stops === 0 ? 'non-stop' : `${stops} stop`}`,
        amount_thb: Math.round(price * this.thbRate),
        meta: { raw: offer },
      };
    });
  }

  async searchHotels(_p: HotelSearch): Promise<BookingOffer[]> {
    // Hotel search is intentionally not wired to Amadeus yet.
    return [];
  }
}
