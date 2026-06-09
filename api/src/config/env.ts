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

  // Media storage. If the R2_* vars are all set, the R2 provider is used;
  // otherwise files are stored on local disk (dev) and served from /uploads.
  MEDIA_PUBLIC_BASE: z.string().url().default('http://localhost:3000'),
  MEDIA_LOCAL_DIR: z.string().default('uploads'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BASE: z.string().url().optional(),

  // Bookings. Set AMADEUS_* to use the real Amadeus flight API (free test tier);
  // otherwise the mock provider is used.
  AMADEUS_CLIENT_ID: z.string().optional(),
  AMADEUS_CLIENT_SECRET: z.string().optional(),
  AMADEUS_THB_RATE: z.coerce.number().optional(),
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
