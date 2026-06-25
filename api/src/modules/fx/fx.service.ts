import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Frankfurter: free, no key, ECB reference rates (updated once each working day).
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB';
// ECB publishes daily, so refresh at most twice a day; cheap insurance against a slow start.
const TTL_MS = 12 * 60 * 60 * 1000;

/** Live USD→THB rate from Frankfurter, cached ~12h. Falls back to
 *  BOOKING_USD_THB_RATE (default 36) on any failure so pricing never breaks. */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cached: { rate: number; at: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get fallbackRate(): number {
    return Number(this.config.get('BOOKING_USD_THB_RATE') ?? 36);
  }

  async usdToThb(): Promise<number> {
    if (this.cached && Date.now() - this.cached.at < TTL_MS) return this.cached.rate;

    try {
      const res = await fetch(FRANKFURTER_URL);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { rates?: { THB?: number } };
      const rate = body.rates?.THB;
      if (typeof rate !== 'number' || rate <= 0) throw new Error('no THB rate in response');
      this.cached = { rate, at: Date.now() };
      return rate;
    } catch (e) {
      // Prefer a stale cached rate over the hardcoded fallback on a transient failure.
      const rate = this.cached?.rate ?? this.fallbackRate;
      this.logger.warn(`FX fetch failed, using ${rate}: ${(e as Error).message}`);
      return rate;
    }
  }
}
