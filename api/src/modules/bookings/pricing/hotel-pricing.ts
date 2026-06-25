export const HOTEL_MARGIN_FLOOR = 0.08;
export const HOTEL_NULL_SSP_FALLBACK = 0.12;
export const HOTEL_DATA_SANITY_MAX = 0.6;

export type HotelPricingDecision =
  | {
      suppressed: false;
      displayPrice: number;
      impliedMarkup: number | null;
      basis: 'ssp' | 'null_ssp_fallback' | 'net_gt_ssp_floor';
      flags: string[];
    }
  | {
      suppressed: true;
      displayPrice: null;
      impliedMarkup: number | null;
      basis: 'invalid_net';
      flags: string[];
    };

export interface HotelPricingInput {
  net: number;
  ssp?: number | null;
}

export function computeHotelDisplayPrice(rate: HotelPricingInput): HotelPricingDecision {
  const net = rate.net;
  const ssp = rate.ssp ?? null;

  if (!Number.isFinite(net) || net <= 0) {
    return {
      suppressed: true,
      displayPrice: null,
      impliedMarkup: null,
      basis: 'invalid_net',
      flags: ['invalid_net'],
    };
  }

  if (ssp == null || !Number.isFinite(ssp) || ssp <= 0) {
    return {
      suppressed: false,
      displayPrice: net * (1 + HOTEL_NULL_SSP_FALLBACK),
      impliedMarkup: null,
      basis: 'null_ssp_fallback',
      flags: ['missing_ssp'],
    };
  }

  if (net > ssp) {
    return {
      suppressed: false,
      displayPrice: net * (1 + HOTEL_MARGIN_FLOOR),
      impliedMarkup: null,
      basis: 'net_gt_ssp_floor',
      flags: ['net_gt_ssp'],
    };
  }

  const impliedMarkup = (ssp - net) / net;

  if (impliedMarkup > HOTEL_DATA_SANITY_MAX) {
    return {
      suppressed: false,
      displayPrice: ssp,
      impliedMarkup,
      basis: 'ssp',
      flags: ['ssp_spread_over_sanity_max'],
    };
  }

  if (impliedMarkup >= HOTEL_MARGIN_FLOOR) {
    return {
      suppressed: false,
      displayPrice: ssp,
      impliedMarkup,
      basis: 'ssp',
      flags: [],
    };
  }

  // Thin spread: net→SSP markup is below the floor. Stay at market parity (sell at
  // SSP, accept the thin margin) rather than hiding bookable inventory. The floor is
  // now a margin-health *flag*, not a price lever — surface it for monitoring.
  return {
    suppressed: false,
    displayPrice: ssp,
    impliedMarkup,
    basis: 'ssp',
    flags: ['thin_ssp_spread'],
  };
}
