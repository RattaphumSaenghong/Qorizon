# Trailr — Supabase Backend

The database schema, security, functions, and seed data for Trailr.

## Key model decision: the unified `stops` table

A **stop** is the single unit that carries both faces of a trip:

```
PLANNED  ──(travel happens)──►  VISITED
(builder)                       (journal / feed)
location, time,                + caption, photos,
duration, notes                  captured_at, likes
```

The same row evolves. `status` is `planned | visited | skipped`. This
replaces the separate `posts` and `itinerary_items` tables from
`TRAILR_ARCHITECTURE_1.md` §5 — a deliberate change to match the
product's Plan↔Story duality.

- **Album** = a derived view of a trip's visited stops + `trips.album_overrides`.
- **Fork** = `fork_trip()` copies stops as `planned` only (story data stripped).
- **Feed** = visited stops from people you follow.

## Files

| File | What |
|---|---|
| `migrations/20260602000001_schema.sql`            | Tables |
| `migrations/20260602000002_indexes.sql`           | Indexes tuned to the query shapes |
| `migrations/20260602000003_functions_triggers.sql`| Counters, `updated_at`, auth bootstrap, `fork_trip()` |
| `migrations/20260602000004_rls.sql`               | Row Level Security (default deny) |
| `seed.sql`                                         | 3 users + 3 trips mirroring `mockTrips.ts` |

## Apply it

### Local (recommended for dev)
```bash
# from Qorizon/
npx supabase init          # once, if no config yet
npx supabase start         # boots local Postgres + Studio
npx supabase db reset      # runs migrations/*.sql then seed.sql
```
Studio: http://localhost:54323 · seeded login: `somchai@trailr.app` / `password123`

### Hosted project
```bash
npx supabase link --project-ref <your-ref>
npx supabase db push       # applies migrations (skip seed in prod)
```
Then copy the project URL + anon key into `trailr/.env.local`.

## Regenerate TypeScript types after schema changes
```bash
npx supabase gen types typescript --local > ../packages/db/src/types/database.ts
```
(Replaces the hand-written types with generated ones — keeps `@trailr/db` in sync.)

## Auth providers to enable in the dashboard
Email/password, Google, Apple, Facebook (per §7). The
`handle_new_user` trigger auto-creates a `public.users` profile on signup.
