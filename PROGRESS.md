# Trailr — Progress & Handoff

> Last updated: 2026-06-21
> Read this first when resuming. Pairs with `BACKEND_ARCHITECTURE.md` and `TRAILR_ARCHITECTURE_1.md`.

---

## ⭐ Active feature: Trip-aware hotel recommendations (`DESIGN_hotel_recs.md`)

Recommend stays scored on the trip's own itinerary (medoid of attraction stops),
budget fit, rating, and rail-station proximity. Books through the existing bookings flow.

**Status — Phases 1–3 done (backend); 4–5 remain:**
- **Phase 1 — scoring engine** ✅ `api/src/modules/recommendations/` — `GET /trips/:id/hotel-recommendations`. Medoid anchor, multi-area guard (>25 km), score = attraction + budget + rating (+ transit). Runs on `MockHotelProvider` today.
- **Phase 2 — `transport_mode`** ✅ (user-built) — `Trip.transport_mode` enum `train|transit|car|walk|mixed`, default `mixed`. Migration `20260621120000_trip_transport_mode` **deployed**. Selector in `new-trip.tsx` + `TripSettingsMenu.tsx`.
- **Phase 3 — Mapbox transit** ✅ `api/src/modules/maps/mapbox.service.ts` — Tilequery nearest rail station, in-memory cache. Activates only when `MAPBOX_TOKEN` set AND mode ∈ {train,transit,mixed}; else transit weight folds into attraction proximity (graceful). **Tilequery verified live** (prefers `stop_type=station` for names, `limit=50`, modes rail/metro_rail). `MAPBOX_TOKEN` is in `api/.env`.
- **Phase 4 — frontend** ⬜ `HotelRecsSheet` + "Suggest stays" button in builder Stays block. **← next**
- **Phase 5 — real hotels** ⬜ auto-lights-up when `LITEAPI_KEY` wired (bookings work).

**Not yet HTTP-smoke-tested** end-to-end (needs API server + a Tokyo trip + JWT). Engine + Mapbox verified in isolation; all typechecks clean.

**Migration note:** resolved pre-existing drift this session — `20260621100000_user_forwarding_token` was realized in DB but unrecorded; marked `--applied` (no SQL), then `migrate deploy` landed `transport_mode`. `migrate status` now clean.

---

## Stack

- **Frontend**: Expo Router (React Native / web) at `trailr/`
- **Backend**: NestJS + Prisma at `api/` — runs **compiled dist**, NOT watch mode
  - After any API change: `npm run build` in `api/` (and `packages/shared/` if enums changed), then restart `node --enable-source-maps dist/src/main`
- **Shared types**: `packages/shared/` and `packages/db/`

---

## Features shipped (most recent session)

### Trip cache fix
`useCreateTrip` mutation invalidates `tripKeys.userTrips(newTrip.user_id)` → profile grid updates immediately after creation.

### Trip management (archive / delete / visibility)
- `TripStatus` includes `'archived'` (`packages/shared/src/enums.ts`, `packages/db/src/types/database.ts`)
- `DELETE /trips/:id` (204, cascade) in `trips.controller.ts` + `trips.service.ts`
- `TripSettingsMenu.tsx`: bottom sheet with visibility radios (public/followers/private), Archive/Unarchive, Delete with two-step confirm
- Profile grid: `⋯` overlay on own trip cards, `showArchived` toggle, `useUserTrips(id, isOwn && showArchived)`

### Stage-aware trip card routing
- `planning` → `/builder/:id`, `album` → `/album/:id`, `living` → `/journal/:id`

### Pre-filled days on trip creation
- `trips.service.ts create()`: if both dates present, creates one `TripDay` per date in a `$transaction` (capped at 60 days)
- Day delete (`removeDay`): sequential ascending `for` loop — safe under `@@unique([trip_id, day_number])`
- Deleted day's stops auto-pool via `onDelete: SetNull` on `Stop.day_id`
- Builder shows "Unsorted" label on unassigned stop pool

### Past-date guard + "Log a past trip" mode
- `new-trip.tsx`: mode toggle `'plan' | 'log'`
- Plan: `assertNotPast(start_date)` on backend; `minDate=today` on `DateRangePicker`
- Log: `backdated: true` in DTO; `assertNotFuture(end_date)` on backend; `maxDate=today` on `DateRangePicker`; `status: 'completed'`, `stage: 'planning'`
- Seeding exempt (uses `PrismaClient` directly, not the NestJS service)

### Date utility refactor
- `trailr/src/lib/date.ts` (new): `toYMD(d)` + `todayYMD()` — replaces 3 local copies in DatePicker, DateRangePicker, new-trip
- Backend: `todayUtcMs()` extracted to eliminate duplication between `assertNotPast` / `assertNotFuture`

---

## Key files

| File | What's notable |
|---|---|
| `api/src/modules/trips/trips.service.ts` | create w/ prefilled days, removeDay w/ resequencing, assertNotPast/Future, todayUtcMs |
| `api/src/modules/trips/trips.controller.ts` | DELETE :id, DELETE :id/days/:dayId |
| `api/src/modules/trips/trip-feeds.controller.ts` | `?includeArchived` query param |
| `api/src/modules/trips/dto/create-trip.dto.ts` | `backdated?: boolean` |
| `packages/shared/src/enums.ts` | `'archived'` in TRIP_STATUS |
| `packages/db/src/hooks/useTrip.ts` | useCreateTrip (invalidates userTrips), useDeleteTrip, useDeleteTripDay, useUpdateTrip |
| `packages/db/src/queries/trips.ts` | fetchUserTrips(includeArchived), deleteTrip, deleteTripDay |
| `trailr/src/lib/date.ts` | toYMD, todayYMD |
| `trailr/src/components/TripSettingsMenu.tsx` | visibility + archive + delete sheet |
| `trailr/src/components/DateRangePicker.tsx` | minDate/maxDate props, disabled day styling |
| `trailr/app/new-trip.tsx` | plan/log mode toggle, backdated flag |
| `trailr/app/builder/[id].tsx` | TripSettingsMenu, delete day, Unsorted pool label |
| `trailr/app/profile/[username].tsx` | stage-aware routing, showArchived toggle, ⋯ menu |

---

## Deferred / not yet done

- Nav arrows in `DateRangePicker` still navigate to all months (greying disabled months' arrows not implemented)
- Stops auto-marked "visited" for logged/album-stage trips (v2, explicitly deferred)
- `MONTHS`/`DAYS` arrays still duplicated between `DatePicker.tsx` and `DateRangePicker.tsx`
