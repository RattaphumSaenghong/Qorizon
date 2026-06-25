import { ConfigService } from '@nestjs/config';
import type { BookingConfirmation, BookingOffer, PassengerDetails } from '@trailr/shared';
import { FxService } from '../../fx/fx.service';
import type { FlightProviderApi, FlightSearch } from './booking-provider';

interface DuffelPlace {
  iata_code?: string;
  name?: string;
  city_name?: string;
}

interface DuffelSegment {
  departing_at?: string;
  arriving_at?: string;
  origin?: DuffelPlace;
  destination?: DuffelPlace;
  marketing_carrier?: { iata_code?: string; name?: string };
  marketing_carrier_flight_number?: string;
  passengers?: Array<{ passenger_id?: string }>;
}

interface DuffelOffer {
  id: string;
  total_amount?: string;
  total_currency?: string;
  owner?: { name?: string };
  slices?: Array<{
    duration?: string;
    origin?: DuffelPlace;
    destination?: DuffelPlace;
    segments?: DuffelSegment[];
  }>;
  passengers?: Array<{ id?: string }>;
}

export class DuffelFlightProvider implements FlightProviderApi {
  readonly name = 'duffel';
  private readonly base = 'https://api.duffel.com';

  constructor(
    private readonly config: ConfigService,
    private readonly fx: FxService,
  ) {}

  private get apiKey(): string {
    return this.config.get<string>('DUFFEL_API_KEY')!;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Duffel-Version': 'v2',
    };
  }

  async searchFlights(p: FlightSearch): Promise<BookingOffer[]> {
    const origin = p.origin ?? 'BKK';
    const destination = p.destination ?? 'NRT';
    const departureDate = p.depart_date ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

    const requestRes = await fetch(`${this.base}/air/offer_requests`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: departureDate }],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        },
      }),
    });
    if (!requestRes.ok) throw new Error(`Duffel offer request failed: ${requestRes.status}`);
    const requestData = (await requestRes.json()) as { data?: { id?: string } };
    const offerRequestId = requestData.data?.id;
    if (!offerRequestId) return [];

    const offersRes = await fetch(`${this.base}/air/offers?offer_request_id=${offerRequestId}&limit=5`, {
      headers: this.headers(),
    });
    if (!offersRes.ok) throw new Error(`Duffel offer search failed: ${offersRes.status}`);
    const offersData = (await offersRes.json()) as { data?: DuffelOffer[] };

    const usdThb = await this.fx.usdToThb();
    return (offersData.data ?? []).map((offer) => {
      const slice = offer.slices?.[0];
      const segments = slice?.segments ?? [];
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];
      // Real itinerary from the segments — drives the flight detail card and the
      // trip-date lock (see DESIGN_flight_date_lock.md). Fall back to the request
      // origin/destination when a field is absent.
      const originCode = firstSeg?.origin?.iata_code ?? slice?.origin?.iata_code ?? origin;
      const destCode = lastSeg?.destination?.iata_code ?? slice?.destination?.iata_code ?? destination;
      const departingAt = firstSeg?.departing_at ?? null;
      const arrivingAt = lastSeg?.arriving_at ?? null;
      const carrier = firstSeg?.marketing_carrier?.iata_code ?? null;
      const carrierName = firstSeg?.marketing_carrier?.name ?? offer.owner?.name ?? null;
      const flightNumber = firstSeg?.marketing_carrier_flight_number ?? null;
      const stops = Math.max(0, segments.length - 1);
      const itinerary = segments.map((s) => ({
        origin: s.origin?.iata_code ?? null,
        destination: s.destination?.iata_code ?? null,
        departing_at: s.departing_at ?? null,
        arriving_at: s.arriving_at ?? null,
        carrier: s.marketing_carrier?.iata_code ?? null,
        carrier_name: s.marketing_carrier?.name ?? null,
        flight_number: s.marketing_carrier_flight_number ?? null,
      }));
      const passengerIds = [
        ...(offer.passengers ?? []).map((x) => x.id).filter(Boolean),
        ...segments.flatMap((s) => (s.passengers ?? []).map((x) => x.passenger_id).filter(Boolean)),
      ];
      const amount = Number(offer.total_amount ?? 0);
      const currency = offer.total_currency ?? 'USD';
      const amountThb = currency === 'THB' ? amount : amount * usdThb;
      return {
        id: offer.id,
        type: 'flight' as const,
        provider: 'duffel' as const,
        title: `${originCode} -> ${destCode}`,
        subtitle: `${offer.owner?.name ?? 'Duffel flight'} · ${segments.length <= 1 ? 'non-stop' : `${segments.length - 1} stop`} · ${slice?.duration ?? departingAt ?? departureDate}`,
        amount_thb: Math.round(amountThb),
        meta: {
          offer_request_id: offerRequestId,
          total_amount: offer.total_amount,
          total_currency: currency,
          passenger_ids: Array.from(new Set(passengerIds)),
          origin: originCode,
          destination: destCode,
          dep_at: departingAt,
          arr_at: arrivingAt,
          carrier,
          carrier_name: carrierName,
          flight_number: flightNumber,
          stops,
          duration: slice?.duration ?? null,
          departing_at: departingAt,
          arriving_at: arrivingAt,
          segments: itinerary,
          raw: offer,
        },
      };
    });
  }

  async bookFlight(offerId: string, passengerDetails?: PassengerDetails): Promise<BookingConfirmation> {
    if (!passengerDetails) {
      return { external_ref: offerId, status: 'pending', raw: { deferred: true } };
    }

    const res = await fetch(`${this.base}/air/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        data: {
          selected_offers: [offerId],
          passengers: [
            {
              title: passengerDetails.title ?? 'mr',
              given_name: passengerDetails.given_name,
              family_name: passengerDetails.family_name,
              born_on: passengerDetails.born_on,
              gender: passengerDetails.gender,
              email: passengerDetails.email,
              phone_number: passengerDetails.phone_number,
            },
          ],
        },
      }),
    });
    if (!res.ok) throw new Error(`Duffel order failed: ${res.status}`);
    const data = (await res.json()) as { data?: { id?: string } };
    return { external_ref: data.data?.id ?? offerId, status: 'confirmed', raw: data as Record<string, unknown> };
  }
}
