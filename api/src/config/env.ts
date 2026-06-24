import { z } from 'zod';

// Validated environment. Fails fast at boot if anything is missing/malformed.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),

  // Media storage. If the R2_* vars are all set, the R2 provider is used;
  // otherwise files are stored on local disk (dev) and served from /uploads.
  MEDIA_PUBLIC_BASE: z.string().url().default('http://localhost:3000'),
  MEDIA_LOCAL_DIR: z.string().default('uploads'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BASE: z.string().url().optional(),

  // Bookings. Leave keys blank for mock mode.
  DUFFEL_API_KEY: z.string().optional(),
  LITEAPI_KEY: z.string().optional(),
  BOOKING_USD_THB_RATE: z.coerce.number().optional(),

  // Mapbox — transit (rail station) proximity for hotel recommendations.
  // Leave blank to disable transit scoring (recs still rank on sights/budget/rating).
  MAPBOX_TOKEN: z.string().optional(),

  // Email ingestion. The signing secret verifies inbound email webhooks; Anthropic
  // is optional and only used as a fallback parser when configured.
  INBOUND_EMAIL_SIGNING_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = schema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
