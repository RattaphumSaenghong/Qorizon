# Trailr — Progress & Handoff

> Last updated: 2026-06-02 · Travel social platform (Thai Gen Z/Millennial), iPad-first.
> Read this first when resuming. Pairs with `TRAILR_ARCHITECTURE_1.md` (product/spec)
> and `supabase/README.md` (DB).

---

## TL;DR state

- **Frontend**: full iPad UI for all flows, built in Expo RN + Expo Router. Beautiful, navigable.
- **Backend**: Supabase project is **live** with full schema, RLS, triggers, seed data.
- **Wired to live DB**: ✅ Feed, ✅ Journal, ✅ Auth (sign-in/up/out).
- **Still on mock data**: Builder, Explore, Album, Booking, Profile content.
- **Next task**: wire the **live fork** in the Builder (`fork_trip` RPC, skim vs full).

---

## Repo / stack

- **Repo**: https://github.com/RattaphumSaenghong/Qorizon (branch `main`)
- **Monorepo** (npm workspaces): `trailr/` (Expo RN app) · `packages/db/` (`@trailr/db` shared SDK) · `supabase/` (migrations + seed)
- **Stack**: React Native 0.85 + Expo SDK 56, Expo Router, React Query, Zustand, Mapbox (Static Images on native + interactive `mapbox-gl` on web), Supabase (Postgres/Auth/RLS).
- **Install rule**: always `npm install <pkg> --legacy-peer-deps` (peer conflicts in SDK 56).
- **Run web**: `cd trailr && npx expo start --web`
- **Type check**: `cd trailr && npx tsc --noEmit` (also compiles `@trailr/db` via path import).

### Secrets (NOT in git — recreate on fresh clone)
`trailr/.env.local` holds:
- `EXPO_PUBLIC_SUPABASE_URL=https://dqrfozcaetlkgojirqjw.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=...` (anon/public key — safe in client)
- `EXPO_PUBLIC_MAPBOX_TOKEN=pk....`

---

## The core data model decision: unified `stops`

**A `stop` is the single unit that carries both faces of a trip** — superseding the
separate `posts`/`itinerary_items` from architecture §5.

```
PLANNED  ──(travel happens)──►  VISITED
(builder)                       (journal / feed)
time, duration, notes          + caption, photos, captured_at, likes
```

- `stops.status`: `planned | visited | skipped`
- `stops.category`: `place | landmark | food | activity | hotel | flight | transport | note`
- **Album** = derived view of a trip's visited stops + `trips.album_overrides` (jsonb). Not a table.
- **Feed** = visited stops from people you follow.
- **Fork** = `fork_trip(source, owner, mode)`; copies stops as `planned`, strips story data.
  - `full` → every stop. `skim` → drops `hotel/flight/transport` + empty days ("their spots & food, I'll book my own stays").

Tables: `users, trips, trip_days, stops, media, trail_points, live_batches, follows, likes, comments, saved_items, bookings, notifications`.

---

## Supabase (project ref `dqrfozcaetlkgojirqjw`)

**IMPORTANT — how the DB was built**: schema was applied by **pasting SQL into the
dashboard SQL Editor by hand** (CLI `supabase link` failed on auth). So the
`supabase_migrations` tracking table is NOT populated — a future `supabase db push`
would try to re-apply everything. Before using the CLI, either run `supabase login`
+ `supabase migration repair` to mark migrations as applied, or keep using the SQL Editor.

**Gotcha we already hit**: RLS got enabled but policies didn't (a paste ran out of
order). Symptom = tables return `[]` to the anon key while the SQL Editor (admin,
bypasses RLS) shows rows. Fix was re-running the policy block. All policies are in
place now.

### Seed data (test, not real users)
3 auth users created via **dashboard → Authentication → Add user**, password `password123`:

| user | id | handle | trip |
|---|---|---|---|
| somchai@trailr.app | `8268109c-d929-490b-b3de-d48d45571174` | @somchai.travels | 7 Days in Japan (`aaaa0001-0000-0000-0000-000000000001`) |
| wanwisa@trailr.app | `3cc12b01-1308-46c9-b58e-783eb5a31162` | @wanwisa.wanders | 5 Days in Chiang Mai (`aaaa0002-0000-0000-0000-000000000002`) |
| ploy@trailr.app | `3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f` | @ploy.eats | Tokyo Ramen Tour (`aaaa0003-0000-0000-0000-000000000003`) |

somchai follows wanwisa + ploy. Trip 1 (Japan) has hotel/flight stops so skim-fork is demonstrable. Counts: 3 users · 3 trips · 8 days · 21 stops · 4 follows · 8 likes.

`supabase/seed.sql` is rewritten with these real IDs (re-runnable after a reset, minus the dashboard user creation step).

---

## What's wired to the live DB

- **`app/(tabs)/index.tsx` (Feed)** — `useQuery` → follows feed if signed in, else public stops. Real captions, like counts, GPS map pins. Loading/empty/error states.
- **`app/journal/[id].tsx` (Journal)** — `fetchJournal(id)` assembles trip + days + visited stops into the `Trip` shape. Map centers on trip coords. Loading + not-found states.
- **Auth** — `app/sign-in.tsx` (sign in/up, browse-without-account), `src/lib/auth.ts`, `src/stores/authStore.ts` (Zustand), `src/providers/AppProviders.tsx` (AuthListener via `onAuthStateChange`). TopBar shows Sign in / avatar. Profile has Sign out at `/profile/me`. Web session persists via localStorage.

## Still on mock data (`src/data/mockTrips.ts`)
- **Builder** (`app/builder/[id].tsx`, `app/(tabs)/trips.tsx`) — uses `getTripById`. Fork modal navigates with `?mode=` but does NOT call `fork_trip` yet.
- **Explore**, **Album** (`app/album/[id].tsx`), **Booking** (`app/booking/[id].tsx`), **Profile content** (shows mock somchai regardless of who's logged in).

---

## @trailr/db SDK (`packages/db/src/`)
- `client.ts` — typed `createSupabaseClient` factory + `Database` type + `fork_trip` RPC signature.
- `types/database.ts` — hand-written to match SQL (regen later via `supabase gen types`).
- `queries/` — `stops.ts`, `trips.ts` (incl. `forkTrip(id, mode, owner?)` → RPC), `users.ts`. DB-boundary casts use `as any` (Supabase generics need generated types); return types stay typed.
- `hooks/` — `useFeedStops`, `useTripStops`, `useToggleLike`, `useTrip`, `useForkTrip`, `useUser`, etc.

---

## NEXT TASKS (in order)

1. **Live fork in Builder** ← do this first
   - In `app/journal/[id].tsx` `handleForkConfirm`, call `useForkTrip().mutate({ sourceTripId: id, mode })` instead of just navigating.
   - Wire `app/builder/[id].tsx` to `useTripStops(forkedTripId)` + `fetchTripDays` so it shows the *forked* trip's real stops; verify skim actually dropped the hotel/flight stops and empty days.
   - Requires being signed in (RLS: insert needs `auth.uid()`).
2. Wire **Profile** to real data (`/profile/me` → logged-in user; `/profile/[username]` → fetch by username; real trips/posts/follow counts).
3. Wire **Album** (derived from visited stops + `album_overrides`) and **Booking**.
4. **Mobile/phone layout** (responsive breakpoints — currently iPad-landscape only).
5. **Native build** (EAS) to get interactive `@rnmapbox/maps` + live trail. Re-add the `@rnmapbox/maps` Expo plugin to `app.json` (removed because its config plugin broke the web export).

---

## Gotchas / lessons
- **Manual SQL paste has no ordering/atomicity** — that's what caused the RLS-without-policies bug. Prefer `supabase db push` once CLI auth is sorted.
- **PowerShell here-strings** for `git commit -m @'...'@` sometimes mis-parse when piped on the same line — use a single-line `-m "..."` to be safe.
- **npm workspace hoisting** pulls `mapbox-gl` to the root `node_modules`; `metro.config.js` has `unstable_enablePackageExports=true` so the web bundler resolves it. Don't remove that.
- **`@rnmapbox/maps`** is native-only; its Expo config plugin breaks `expo export --platform web`. Keep it out of `app.json` plugins until doing the native build.
- Sign-up of brand-new users may need email confirmation disabled (Auth → Providers → Email) for instant testing. The 3 seed users are already confirmed.
