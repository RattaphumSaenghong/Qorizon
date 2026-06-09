# Trailr — Backend Architecture (NestJS)

> Design doc for replacing the Supabase BaaS backend with a self-owned **NestJS** API.
> Decided up front to avoid a second pivot. Pairs with `TRAILR_ARCHITECTURE_1.md` (product)
> and the existing `supabase/` SQL (the logic being ported).
> Status: **proposed** — not yet built. Last updated 2026-06-04.

---

## 0. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Database | **Keep Supabase Postgres** (Nest connects via `DATABASE_URL`) | Keep live data + seed; only the API/auth layer changes |
| Auth | **Own JWT auth in Nest** (access + refresh) | Full independence from Supabase Auth |
| ORM | **Prisma** | Type-safe, good migrations, introspects existing DB |
| API style | **REST** (JSON) | Matches what the frontend already calls |
| Realtime | **Designed now, built later** — WebSocket gateway + event bus stubbed | Live trail/feed/notifications slot in without a pivot |
| Media | **S3-compatible (Cloudflare R2)** via `StorageService`, presigned uploads | Independent of Supabase Storage |
| Contract | **`packages/shared`** types package, imported by api + app | One source of truth, compile-time safety |
| V1 scope | **Core slice working** (auth, trips, stops, social); media/live/bookings/notifications **scaffolded as stubs** | Runs end-to-end fast, no later rearchitecture |

---

## 1. Principles

1. **Thin controllers, fat services, dumb repositories.** HTTP concerns in controllers, business logic in services, DB access via Prisma in a repository layer.
2. **Authorization is explicit and centralized.** RLS is gone — every read/write goes through a policy check in code. No endpoint trusts the client for ownership.
3. **All logic lives in Nest.** No DB triggers — counters, `updated_at`, fork, and signup are all service-layer code wrapped in transactions. The DB holds structure + constraints only. See §6.
4. **Stub, don't omit.** Modules we aren't building yet still get a folder, a module class, and typed DTOs so the shape is fixed.
5. **One contract.** Request/response types live in `packages/shared`; neither side hand-rolls the other's shapes.

---

## 2. Monorepo layout (additions in **bold**)

```
Qorizon/
  trailr/                  Expo RN app (unchanged screens)
  packages/
    db/                    → becomes a thin REST client (same fn names, fetch internals)
    **shared/**            NEW @trailr/shared — DTOs, enums, response envelope types
  **api/**                 NEW NestJS backend
  supabase/                kept until api is verified, then SQL is archived
```

Workspaces already use npm; `api/` and `packages/shared/` join the workspace list.

---

## 3. Tech stack (`api/`)

- **NestJS 10** (Express adapter)
- **Prisma** (client + migrate)
- **Passport** + `@nestjs/jwt` — JWT access/refresh strategy
- **bcrypt** — password hashing
- **class-validator / class-transformer** — DTO validation via global `ValidationPipe`
- **@nestjs/config** — env + schema validation (`zod` or Joi)
- **@nestjs/event-emitter** — in-process event bus (decouples writes from realtime/notifications)
- **@nestjs/websockets + socket.io** — realtime gateway (wired, handlers stubbed)
- **@aws-sdk/client-s3** + `@aws-sdk/s3-request-presigner` — R2 storage
- **pino** (`nestjs-pino`) — structured logging

---

## 4. Module map

### Feature modules (own a resource)
| Module | Status | Responsibilities |
|---|---|---|
| `auth` | **build** | signup, login, refresh, `/me`; bcrypt; JWT strategy; guards |
| `users` | **build** | profile read/update, follow/unfollow, is-following |
| `trips` | **build** | CRUD, days, feed-of-following, **fork** |
| `stops` | **build** | CRUD, mark-visited, feed stops, like/unlike |
| `media` | **stub** | presigned upload URL, attach media to stop (interface + DTOs only) |
| `live` | **stub** | trail points, live batches, publish (gateway events defined, no-op) |
| `bookings` | **stub** | provider abstraction (amadeus/agoda), quote/book (interface only) |
| `notifications` | **stub** | list/mark-read; consumes events from the bus |

### Infrastructure modules (cross-cutting, injectable)
| Module | Responsibilities |
|---|---|
| `PrismaModule` | `PrismaService` (connect/disconnect lifecycle), single client |
| `AuthZ` (policy) | `PolicyService`: `canReadTrip(userId, tripId)`, `ownsTrip(...)` — the RLS port |
| `StorageModule` | `StorageService` interface + `R2StorageService` impl |
| `RealtimeModule` | `RealtimeGateway` (socket.io) + subscribes to event bus |
| `EventsModule` | re-exports EventEmitter; defines event names + payload types |
| `ConfigModule` | validated env |

---

## 5. Request lifecycle & layering

```
HTTP → Controller (DTO validation, @CurrentUser())
     → Guard (JwtAuthGuard, then resource PolicyGuard)
     → Service (business logic, transactions, emits events)
     → Repository / PrismaService (DB)
     → Response DTO (shape from packages/shared)
```

- **`JwtAuthGuard`** — global default; `@Public()` decorator opts an endpoint out (e.g. public feed, login).
- **`@CurrentUser()`** param decorator — extracts `userId` from the validated JWT. Endpoints never take `userId` from the body/query for identity.
- **Policy checks** live in `PolicyService` and are called explicitly in services (not magic). For common cases a `@CheckPolicy('trip:read')` guard reads the `:id` param and calls the service.

---

## 6. Porting the SQL logic — what goes where

This is the heart of the migration. Each piece of current SQL has a deliberate home:

| Current SQL | New home | Rationale |
|---|---|---|
| **RLS policies** (`can_read_trip`, `owns_trip`, per-table) | `PolicyService` + guards in Nest | Authorization is now app logic; service role connection bypasses any leftover RLS |
| **`fork_trip` RPC** | `TripsService.fork()` in a Prisma `$transaction` | Orchestration/business logic belongs in the app; easier to test & evolve |
| **`handle_new_user` trigger** | `AuthService.signup()` | Nest creates the profile row; no `auth.users` to trigger on |
| **Counter triggers** (`sync_like_count`, comment, follow) | **`*Service` methods in a Prisma `$transaction`** | All logic in Nest; the write + counter update commit atomically together |
| **`touch_updated_at` trigger** | **Prisma `@updatedAt`** | Prisma sets `updated_at` on every update; no DB trigger |

> **Counters — decided:** all counter logic lives in Nest services, **no DB triggers**. Every mutating path that affects a count does the write *and* the counter bump in the **same `$transaction`** so they cannot drift. Concretely:
> - like/unlike → `StopsService` inserts/deletes the like row and `±1`s `stops.like_count` in one tx.
> - comment add/delete → `StopsService`/`CommentsService` adjusts `stops.comment_count` in the same tx.
> - follow/unfollow → `UsersService` adjusts both `following_count` and `follower_count` in one tx.
>
> A single `CounterService` (or per-service helper) centralizes the increment SQL so the pattern isn't copy-pasted. Risk acknowledged: any *future* write path must go through these services — direct DB writes would bypass the counters. The repo has no other writers, so this holds.

### Schema reshape for own-auth (Prisma migration)
- `users`: **add** `email text unique not null`, `password_hash text not null`.
- `users.id`: **drop** `references auth.users(id)` → becomes a standalone `uuid default gen_random_uuid()`.
- **Drop** `handle_new_user` trigger + the `auth` schema dependency.
- Refresh tokens: **add** `refresh_tokens(id, user_id, token_hash, expires_at, revoked)` table.
- Existing 3 seed users **re-seeded** with `password123` bcrypt-hashed (same ids/usernames → all trip FKs intact).

---

## 7. Auth design

- **Access token**: short-lived JWT (~15 min), `sub = userId`, signed `JWT_ACCESS_SECRET`.
- **Refresh token**: long-lived (~30 days), opaque random, **hashed** in `refresh_tokens`; rotated on use. Good fit for a mobile app that stays logged in.
- **Endpoints**: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Frontend stores tokens (web: localStorage as today; native: SecureStore later). `packages/db` attaches `Authorization: Bearer` and transparently calls `/auth/refresh` on 401.

---

## 8. API conventions

- **Base**: `/api/v1`.
- **Errors**: Nest exception filter → `{ statusCode, error, message }`. Map domain errors (NotFound, Forbidden, Validation) to proper HTTP codes.
- **Lists**: cursor or limit/offset returning `{ data, nextCursor? }`. Feed endpoints take `?limit=`.
- **Response shape = `packages/shared` types**, snake_case fields preserved to match the current DB/SDK shapes (so frontend mappers don't change). Prisma maps camelCase model fields → snake_case columns via `@map`.

### Endpoint surface (mirrors current `@trailr/db`)
```
auth:   POST /auth/signup | /auth/login | /auth/refresh | /auth/logout · GET /auth/me
users:  GET /users/:id · GET /users/by-username/:u · PATCH /users/:id
        POST /users/:id/follow · DELETE /users/:id/follow · GET /users/:id/is-following
trips:  GET /trips/:id · GET /users/:id/trips · GET /feed/trips
        POST /trips · PATCH /trips/:id · GET /trips/:id/days · POST /trips/:id/fork
stops:  GET /trips/:id/stops · GET /feed/stops
        POST /stops · PATCH /stops/:id · DELETE /stops/:id · POST /stops/:id/like
media:  (stub) POST /media/presign · POST /stops/:id/media
live:   (stub) POST /trips/:id/trail · POST /trips/:id/batches ...
```

---

## 9. Realtime (designed, stubbed)

- `RealtimeGateway` (socket.io namespace `/live`) authenticates the socket via the same JWT.
- Rooms per trip: `trip:{id}`. Clients join trips they can read (policy-checked).
- Services **emit domain events** (`stop.visited`, `trail.point`, `batch.published`, `notification.created`) onto the EventEmitter bus. `RealtimeModule` + `NotificationsModule` subscribe.
- **Now**: gateway boots, auth works, rooms join; handlers are no-ops/log only. **Later**: flip on emit→broadcast, no rearchitecture.

---

## 10. Storage (Cloudflare R2)

- `StorageService` interface: `presignUpload(key, contentType)`, `publicUrl(key)`, `delete(key)`.
- `R2StorageService` — S3 SDK against R2 endpoint. Config: `R2_ACCOUNT_ID`, `R2_BUCKET`, keys, `R2_PUBLIC_BASE`.
- Upload flow (when built): client asks `POST /media/presign` → uploads directly to R2 → `POST /stops/:id/media` records the row with the resulting `cdn_url`.

---

## 11. Folder structure (`api/`)

```
api/
  src/
    main.ts                  bootstrap, global pipes/filters, /api/v1 prefix
    app.module.ts
    config/                  env schema + ConfigModule
    prisma/                  PrismaModule, PrismaService, schema.prisma, migrations/, seed.ts
    common/
      decorators/            @Public, @CurrentUser, @CheckPolicy
      guards/                JwtAuthGuard, PolicyGuard
      filters/               HttpExceptionFilter
      interceptors/          logging
    authz/                   PolicyService (RLS port)
    events/                  event names + payload types, EventsModule
    realtime/                RealtimeGateway (stub)
    storage/                 StorageService + R2 impl
    modules/
      auth/                  controller, service, strategies, dto
      users/
      trips/                 incl. fork logic
      stops/
      media/      (stub)
      live/       (stub)
      bookings/   (stub)
      notifications/ (stub)
  test/                      e2e (auth flow, fork skim/full, policy denials)
  package.json  tsconfig.json  .env.example
```

---

## 12. Migration & cutover plan (low-risk)

1. Stand up `api/` **alongside** the working Supabase setup; don't delete `supabase/`.
2. `prisma db pull` the live schema → baseline; then a migration for the auth reshape (§6).
3. Build core slice; verify each endpoint returns the **same JSON shape** the SDK expects.
4. Rewrite `packages/db` internals to `fetch` the Nest API (same exported fn names → screens untouched).
5. Verify Feed / Journal / Auth against Nest. Then archive `supabase/` SQL (keep for reference).

---

## 13. Verification criteria (per core module)

- **auth**: signup → login → `/me` returns user; refresh rotates; bad password 401.
- **policy**: cannot read a `private` trip you don't own; cannot edit another user's stop.
- **trips.fork**: `skim` drops hotel/flight/transport + empty days; `full` copies all; story data stripped; source `fork_count++`.
- **stops.like**: like inserts row and `like_count` increments **in one transaction** (service-layer, no trigger); unlike reverses both.
- **counters**: follow bumps both follower/following counts in one tx; comment add/delete adjusts `comment_count` atomically.
- **contract**: `cd api && npm run build` and `cd trailr && npx tsc --noEmit` both pass.

---

## 14. Out of scope (explicit)

- Expo UI screens, Mapbox, screens still on mock data (Builder/Explore/Album/Booking/Profile content).
- Password-reset emails, social login.
- Full implementations of media/live/bookings/notifications (stubbed only).
- Deployment/hosting choice (separate decision).

---

## 15. Decisions — all settled

Every decision in this doc is frozen, including counters (→ Nest service transactions, no DB triggers, §6). Ready to build.
