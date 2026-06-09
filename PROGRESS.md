# Trailr — Progress & Handoff

> Last updated: 2026-06-08 · Travel social platform (Thai Gen Z/Millennial), iPad-first.
> Read this first when resuming. Pairs with `BACKEND_ARCHITECTURE.md` (backend design),
> `TRAILR_ARCHITECTURE_1.md` (product/spec), and the auto-memory `project_trailr.md`.

---

## TL;DR state

- **Backend**: self-owned **NestJS + Prisma** API (`api/`) on Supabase **Postgres** (Prisma owns
  the schema). All modules done & verified against the live DB.
- **Frontend FULLY wired**: every screen runs on the live REST API with real photos/avatars.
- **A trip now has 3 stages**: `planning → living → album` (`trips.stage`), and opening a trip
  routes by stage (planning→builder, living→journal, album→album).
- **Trip creation flow**: ＋New trip → **setup page** (destination, dates, optional budget) →
  planning board.
- **Collaborators**: invite people you follow → pending → accept/decline; per-member **user info**
  (real name + phone, phone visible to co-members only).
- **Builder is a real planner**: tap the map to drop stops, edit/reorder them, invite friends.
- **Social layer**: likes, comments, follows, saves, notifications. **Album editing** done.
- **Phone-responsive STARTED** (feed converted; pattern + primitives exist). **Design-system
  polish** done (toasts, press feedback, skeletons, motion tokens).
- **What's left**: finish phone rollout, smooth collapse animation, place-search/date-picker,
  set seed stages, new features (messaging/search), deploy. See "What's left".

---

## Run it

```
# 1. API  (repo root) — start FIRST
npm run start -w @trailr/api            # → http://localhost:3000/api/v1   (nest start, no watch)
# 2. App
cd trailr && npx expo start --web       # → http://localhost:8081   (iPad-landscape looks best)
```
- Log in: `somchai@trailr.app` / `password123` (richest data; also `wanwisa@`, `ploy@`).
- `trailr/.env.local` needs `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1` + `EXPO_PUBLIC_MAPBOX_TOKEN` (both set).
- **Type check**: `cd trailr && npx tsc --noEmit` · `cd api && npx tsc --noEmit -p tsconfig.json`.
- **Backend code changes need an API restart** (no watch) — or use `npm run start:dev -w @trailr/api`.
- **Re-seed / reset DB to canonical state**: `npm run seed -w @trailr/api` (idempotent; clears
  non-canonical trips, recomputes counts/eligibility/saved). Run after any manual test data.

---

## Repo / stack

- **Repo**: https://github.com/RattaphumSaenghong/Qorizon (branch `main`)
- **Monorepo** (npm workspaces): `trailr/` (Expo RN app) · `api/` (NestJS) · `packages/db/`
  (`@trailr/db` REST client + hooks) · `packages/shared/` (contract types) · `archive/supabase/` (historical).
- **Stack**: React Native 0.85 + Expo SDK 56, Expo Router, React Query, Zustand, Mapbox
  (interactive `mapbox-gl` on web), `expo-location`. Backend: NestJS 11, Prisma 6, JWT, Supabase Postgres.
- **Install rule**: `npm install <pkg> --legacy-peer-deps` (SDK 56 peer conflicts).
- After editing `packages/shared`, **rebuild it** (`npm run build -w @trailr/shared`) so the API picks it up.

### Secrets (gitignored)
- `api/.env` — `DATABASE_URL`/`DIRECT_URL`, `JWT_*`, optional `R2_*`/`AMADEUS_*`. `.env.example` documents all.
- `trailr/.env.local` — `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAPBOX_TOKEN`.

---

## The core data model

A **`stop`** carries both faces of a trip (PLANNED in builder → VISITED in journal/feed).
- `stops.status`: `planned | visited | skipped` · `category`: `place|landmark|food|activity|hotel|flight|transport|note`
- **A visited stop = an IG-style post.** Likes/comments/media/feed hang off the stop.
- **Album** = derived view of visited media + `trips.album_overrides` (jsonb). Not a table.
- **Fork** = `TripsService.fork()` (Prisma tx): copies plan as `planned`, strips story; `full`/`skim`.
- **Feed-eligibility**: a visited stop reaches the feed only if temporal (live or ≤end+14d) AND
  spatial (≤1km of GPS trail), or business account → `stops.feed_eligible` (recomputed on trail ingest).

### Trip lifecycle & collaborators (this session)
- **`trips.stage`** = `planning | living | album` (default `planning`); plus `destination`,
  `budget` (int), `budget_currency` (default THB).
- **`trip_members`** table: `(trip_id, user_id, role, status pending|accepted|declined, invited_by)`,
  unique per (trip,user). Owner-only invites; invitee accepts/declines.
- **`users.real_name`, `users.phone`** — real_name is public; **phone only to trip co-members or yourself**.

Tables: `users, trips, trip_days, stops, media, trail_points, live_batches, follows, likes,
comments, saved_items, bookings, notifications, trip_members` (+ `refresh_tokens`).
Migrations in `api/prisma/migrations/` (latest: `..._trip_stages_members_user_pii`).

---

## Backend — `api/` (NestJS + Prisma) · all modules done & verified

Prisma owns the schema. All former SQL logic (RLS, triggers, fork) is TypeScript services.
**No DB triggers** — counters run in service-layer `$transaction`s.

| Module | Highlights |
|---|---|
| **auth** | signup/login/refresh/logout/me · JWT access + rotating refresh · bcrypt |
| **authz** (`PolicyService`) | RLS port: `canReadTrip` / `ownsTrip` + asserts |
| **users** | profile, follow/unfollow, posts grid, **`GET /users/:id/following`** (invite picker), **phone PII gated to co-members** |
| **trips** | CRUD (create accepts `stage`/`destination`/`budget`), following feed, days, **fork (skim/full)** |
| **stops** | CRUD + **`PATCH /stops/:id` (updateStop)**, mark-visited, feed, discover, like, feed-eligibility |
| **albums** | derived media + `album_overrides`; **`?include_excluded`** (owner) so exclude is reversible |
| **members** *(new)* | invite (owner) / list / respond (accept-decline) / remove + `GET /me/trip-invites`; invite → notification |
| **live-trail** | live-mode toggle, trail ingest (→ recompute eligibility), batches + notif fan-out |
| **notifications** | list / unread-count / mark-read; `trip_invite` type added |
| **media** | `StorageService` (Local dev / R2 prod), base64 upload, served at `/uploads` |
| **bookings** | provider abstraction (Mock / Amadeus-ready), search/book/confirm |
| **saved** | bookmark stop or trip, list, toggle |
| **comments** | list/add/delete, `comment_count` counter tx |

Shared helpers: `api/src/common/prisma-selects.ts` (`AUTHOR_SELECT`), `dates.ts` (`iso`/`dateOnly`),
`decorators/public-read.decorator.ts` (`@PublicRead()` = `@Public()` + optional-JWT guard).

---

## Frontend — every screen on the live API

`packages/db` exports fn names + React Query hooks; internals call REST via `http.ts`
(Bearer + 401→refresh). Auth via `src/lib/auth.ts` + `authStore` (Zustand) + `AppProviders`
(which also mounts the **ToastProvider**).

| Screen | State |
|---|---|
| **Feed** (`(tabs)/index.tsx`) | following/discover, real photos+avatars, **like** (optimistic), bookmark+toast, comments modal, friendly error+Retry, skeletons; filters incl. **On-map** (only posts inside the map viewport; others are "coming soon" placeholders) |
| **New Trip** (`new-trip.tsx`) *(new)* | setup page: destination + dates + optional budget → creates planning trip → builder |
| **Builder** (`builder/[id].tsx`) | **rebuilt**: tap map to drop a stop, tap to edit, ▲▼ reorder, ＋Add, toasts, **👥 Friends** (collaborators modal), phone-responsive; auto-saved |
| **Journal** (`journal/[id].tsx`) | trip+days+visited stops, real GPS **trail** (solid) + stop **route** (dashed), **card↔pin highlight**, **● Record trail** (owner), collapsible map (70/30↔30/70), Share/Save, fork |
| **Album** (`album/[id].tsx`) | derived album, pins fixed (inherit stop coords), collapsible map, owner Edit (✕ exclude/re-include + tap-caption), Share |
| **Profile** (`profile/[username].tsx`) | posts/trips, follow, edit-profile, real avatar, sign out |
| **Trips** (`(tabs)/trips.tsx`) | "My Trips" (opens by **stage**), ＋New trip → setup, **Trip invites** banner (accept/decline) |
| **Explore** (`(tabs)/explore.tsx`) | discover masonry, category filters; rail map **recenters to the selected post** (`center` prop) |
| **Booking** / **Saved** / **Notifications** / **Auth** | as before |

Shared components (this session): `Toast`+`useToast`, `PressableScale` (spring press + web hover),
`Skeleton`/`FeedCardSkeleton`, `CoverImage`, `MapSheet` (phone bottom-sheet for the map),
`LiveBadge`, `TripMembersModal`. Hooks: `useResponsive` (`isPhone = width<768`),
`useCollapsibleSplit` (state-driven width split), `useTrailRecorder`.

**`MapView` (web) props**: `posts`, `trail` (solid GPS), `route` (dashed connector),
`activeId`+`onSelectPost` (selection/highlight), `center` (ease-to on change),
`onBoundsChange` (On-map filter), `onMapPress` (builder tap-to-place). It runs a **`ResizeObserver`
→ `map.resize()`** so the canvas tracks container size (collapse/sheet/window).

---

## Seed data (test users, password `password123`)

| user | id | real_name / phone | trip |
|---|---|---|---|
| somchai@trailr.app | `8268109c-…71174` | Somchai Saetang / +66 81 234 5678 | 7 Days in Japan (`aaaa0001-…0001`) — trail + skim-able logistics |
| wanwisa@trailr.app | `3cc12b01-…a31162` | Wanwisa Phokin / +66 89 555 0142 | 5 Days in Chiang Mai (`aaaa0002-…0002`) |
| ploy@trailr.app | `3c7c71f3-…a6648f` | Pornploy In-on / +66 86 777 9921 | Tokyo Ramen Tour (`aaaa0003-…0003`) |

somchai follows wanwisa+ploy; wanwisa follows somchai. Media use real `picsum.photos` URLs.
**Note**: seed trips currently default to `stage = 'planning'` (so they open in the builder).
Set proper stages in `seed.ts` if you want the Japan trip to open as living/album.

---

## What's left (in priority order)

1. **Finish phone-responsive rollout** — apply the feed/`MapSheet` pattern to the remaining
   split-pane screens: `explore`, `journal`, `album`, `booking`, profile, and the `saved`/`trips`
   rails. Add safe-area insets.
2. **Builder depth** — real **place search/geocoding** (currently tap-map only, no autocomplete);
   a **date picker** on the New-Trip page (plain `YYYY-MM-DD` text inputs for now).
3. **Smooth collapse animation** — the journal/album split currently **snaps** (state-driven width).
   A true glide needs a transform-based rebuild (JS-Animated layout props don't flush on RN-web — see gotchas).
4. **Set seed trip stages** so all three stages are demoable from the Trips list.
5. **New features (need backend):** messaging/DMs, global search (TopBar box is decorative),
   Profile Map tab real visited-city pins; real algorithms for Following/Nearby/For-you.
6. **Deploy** (hosting + real `R2_*`/`AMADEUS_*`) and a **native EAS build** (add `@rnmapbox/maps`
   + `expo-location` config plugins to `app.json` then) for background live-trail on device.
7. **Cleanup**: delete dead `trailr/src/components/FeedCard.tsx` (real card is inline in `(tabs)/index.tsx`).

---

## Gotchas / lessons

- **API validation is `forbidNonWhitelisted`** — sending a field the DTO doesn't declare → 400
  "property X should not exist". Bit us with `batch_date` (createStop) and would with
  `forked_from_id`/`album_overrides` (createTrip). The SDK create fns use **explicit allow-lists**;
  keep them in sync when adding columns.
- **RN-web does NOT flush JS-driven (`useNativeDriver:false`) Animated updates for layout props**
  (`flex`, `width`) — only the initial value renders. Use **state-driven** values for resizes
  (native-driver transforms/opacity DO work — that's why MapSheet drag/LiveBadge/PressableScale animate).
  A CSS `transition: width` also broke flex sizing here — avoid.
- **Mapbox canvas doesn't auto-resize** on a flex/width container change → `MapView` has a
  `ResizeObserver` calling `map.resize()`. Keep it (also fixes MapSheet/window resizes).
- **`prisma migrate dev` / `generate` EPERM on Windows** when the API is running (engine DLL locked) —
  **stop the API first** (free port 3000), then migrate/generate, then restart.
- **Preview MCP owns port 8081** — using it starts/tears down its own dev server, which can kill the
  user's open tab. Restart `expo start --web` afterward.
- **Prisma blocks AI from destructive migrate** (`reset`/`--force-reset`) — needs `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Additive migrations are fine.
- **Two DB URLs**: `DATABASE_URL` = pooler `:6543 ?pgbouncer=true` (runtime); `DIRECT_URL` = `:5432` (migrations).
- **Counters live in services** (no triggers) — every count-affecting write path must go through the tx, or counts drift; re-seed recomputes.
- **`packages/db` is self-contained** (own `types/database.ts`, no `@trailr/shared` import) to avoid Metro resolution issues.
- **Web map markers**: don't set `transform` on the Mapbox-positioned marker el — scale an inner child.
- **`@rnmapbox/maps`** stays out of `app.json` until the native build (plugin breaks web export).
  `metro.config.js` `unstable_enablePackageExports=true` resolves `mapbox-gl` on web.
- **Stop the API** (PowerShell): `Get-NetTCPConnection -LocalPort 3000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`.
