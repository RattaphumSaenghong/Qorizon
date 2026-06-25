import type { BookingOffer } from '@trailr/db';

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
