# Design — Booking System Redesign

> **Supersedes:** `DESIGN_planner_logistics.md` (Phase 1 UI work carries over; the Amadeus
> provider plan is dropped entirely; new ingestion pipeline added.)
>
> **Status:** PLAN ONLY — not implemented.

---

## 1. What changed and why

**Amadeus self-serve API is decommissioned.** The test-tier API we planned to use for live
flight search no longer exists. The existing `AmadeusBookingProvider` in the codebase is
dead code.

**New direction — two paths for bookings to enter the Planner:**

| Path | Model | Source |
|---|---|---|
| **A — Email ingestion** | TripIt model | User forwards confirmation email → parse → inventory pool → user matches to trip |
| **B — In-app booking** | Direct search + book | User searches in Planner → Duffel (flights) / LiteAPI (hotels) → book → block auto-created |

Both paths create the same thing: an **assigned stop block** (`flight` or `hotel` category)
in the trip itinerary. The ingestion path adds a staging pool step; the in-app path writes
directly.

---

## 2. Current codebase state

**What exists:**
- `BookingsService` — search / create / confirm / cancel. Service layer is solid; only the
  provider wiring needs replacing.
- `BookingProviderApi` interface — `searchFlights` + `searchHotels` on one symbol. Currently
  wires to `AmadeusBookingProvider` (flights) or `MockBookingProvider`.
- `Booking` Prisma model — `user_id`, `trip_id`, `stop_id`, `type`, `provider`,
  `external_ref`, `status`, `amount_thb`, `commission_thb`, `raw_payload`. Shape is reusable.
- `builder/[id].tsx` — `isLogistics` helper + distinct Flights/Stays blocks already in working
  tree (partially built). `BookingSearchModal` imported.
- No `InventoryItem` model. No ingestion module.

**What's dead:**
- `AmadeusBookingProvider` — delete it.
- `AMADEUS_*` env vars in `.env.example` — replace with `DUFFEL_API_KEY`, `LITEAPI_KEY`.

---

## 3. Provider decisions

| Type | Provider | Why |
|---|---|---|
| Flights | **Duffel** | Full booking API (search → order → ticket); self-serve sandbox; Trailr as merchant of record |
| Hotels | **LiteAPI (Nuitée)** | Search → rate → book; sandbox available; decent APAC coverage |
| Local dev | **MockBookingProvider** | Used when neither key is present; returns realistic fake data so the UI works offline |

**Split the provider token:** flights and hotels are now separate services with different
auth schemes. Replace the single `BOOKING_PROVIDER` token with `FLIGHT_PROVIDER` and
`HOTEL_PROVIDER`. `BookingsService` injects both.

### Duffel (flights)
- REST API: `https://api.duffel.com` (test mode: `Duffel-Version: v2`, `Authorization: Bearer DUFFEL_API_KEY`)
- Test env uses synthetic data, no real tickets.
- Flow: `offer_requests` POST (search) → `offers` GET → `orders` POST (book) → receive `order.id` as `external_ref`.
- Payment: Duffel Balance or Duffel Payments. For MVP/demo: Duffel Balance top-up in test mode bypasses card entry.
- **We do not handle raw card data.** Duffel owns payment.

### LiteAPI (hotels)
- REST API: `https://api.liteapi.travel/v3.0` — `X-API-Key: LITEAPI_KEY`
- Sandbox key gives realistic hotel data for common APAC cities.
- Flow: `/hotels` (search by city/lat-lng) → `/rates` (get nightly rates for a hotel) →
  `/book` (prebook hold) → `/confirm` (charge) → receive `bookingId` as `external_ref`.
- Payment: LiteAPI guest-pay flow. For MVP/demo: test mode sandbox bookings don't charge.

---

## 4. Path A — Email ingestion (TripIt model)

### How it works

1. **Every user gets a unique forwarding address:** `{username}-{token}@in.trailr.app`
   - Token is a random 12-char hash stored in DB, unique per user.
   - Inbound email provider (e.g. Mailgun inbound routes / SendGrid Inbound Parse) routes
     `*@in.trailr.app` to a signed webhook.
2. **User forwards** their flight/hotel confirmation to that address. No inbox OAuth, no
   CASA audit, no permissions granted — they push to us, we don't pull.
3. **Webhook → `IngestEmailService`:**
   - Try JSON-LD structured data first (`<script type="application/ld+json">` — airlines
     and OTAs often include this in HTML bodies).
   - Fallback: send stripped text body to Anthropic Claude with a strict extraction prompt
     → returns `{ type, airline/hotel_name, ref, origin, dest, dep_time, arr_time,
     check_in, check_out, nights, price_thb }`.
   - Validate the parsed payload; reject if type is unrecognizable.
4. **Write `InventoryItem`** (status `unmatched`).
5. **Notify user** via in-app notification: "✉ Found a JAL flight in your email — add to a
   trip?" → opens Inventory screen.
6. **Inventory screen:** user reviews items, taps "Add to trip" → picks trip → creates an
   `assigned` stop block (+ `Booking` row linking to the external ref).

### `InventoryItem` schema (new Prisma model)

```prisma
model InventoryItem {
  id               String    @id @default(uuid()) @db.Uuid
  user_id          String    @db.Uuid
  source           String    // 'email_forward'
  type             String    // 'flight' | 'hotel'
  raw_payload      Json      // { subject, body_text, body_html }
  parsed           Json      // normalized extraction result
  status           String    @default("unmatched")  // 'unmatched' | 'matched' | 'dismissed'
  matched_stop_id  String?   @db.Uuid
  received_at      DateTime  @default(now()) @db.Timestamptz(6)

  user         User  @relation(fields: [user_id], references: [id], onDelete: Cascade)
  matched_stop Stop? @relation(fields: [matched_stop_id], references: [id], onDelete: SetNull)

  @@index([user_id, status])
  @@map("inventory_items")
}
```

Add `inventory_items InventoryItem[]` to `User` and `matched_from InventoryItem[]` to `Stop`.

### New API module: `api/src/modules/ingestion/`

| File | Purpose |
|---|---|
| `ingestion.module.ts` | NestJS module, imports `PrismaModule`, `NotificationsModule` |
| `ingestion.service.ts` | Parse + create InventoryItem + fan-out notification |
| `ingestion.controller.ts` | `POST /api/v1/ingest/email` — **no JWT auth**; verified by HMAC sig |
| `dto/ingest-email.dto.ts` | `{ from, subject, body_text, body_html, signature }` |
| `parsers/jsonld.parser.ts` | Extract from `<script type="application/ld+json">` |
| `parsers/llm.parser.ts` | Anthropic extraction fallback |
| `inventory.controller.ts` | `GET /api/v1/inventory` (authed; user's items), `PATCH /api/v1/inventory/:id/match`, `PATCH /api/v1/inventory/:id/dismiss` |

The `match` endpoint accepts `{ trip_id }`, creates the stop block, writes a `Booking` row
with `provider: 'email'`, and flips `status → 'matched'`.

### Notification type

Add `'inventory_item'` to `NOTIFICATION_TYPE` in `packages/shared/src/notifications.ts`.
Bell copy: "Found a {type} confirmation in your email." `open()` routes to `/inventory`.

---

## 5. Path B — In-app booking

### Provider interface change

```ts
// Split into two tokens
export const FLIGHT_PROVIDER = Symbol('FLIGHT_PROVIDER');
export const HOTEL_PROVIDER  = Symbol('HOTEL_PROVIDER');

export interface FlightProviderApi {
  readonly name: string;
  searchFlights(p: FlightSearch): Promise<BookingOffer[]>;
  bookFlight(offerId: string, passengerDetails: PassengerDetails): Promise<BookingConfirmation>;
}

export interface HotelProviderApi {
  readonly name: string;
  searchHotels(p: HotelSearch): Promise<BookingOffer[]>;
  bookHotel(rateId: string, guestDetails: GuestDetails): Promise<BookingConfirmation>;
}
```

`BookingsService` injects `@Inject(FLIGHT_PROVIDER)` and `@Inject(HOTEL_PROVIDER)`.

### New provider files

| File | Replaces |
|---|---|
| `providers/duffel.provider.ts` | `amadeus.provider.ts` (delete the old one) |
| `providers/liteapi.provider.ts` | hotels stub in `mock.provider.ts` |
| `providers/mock.provider.ts` | keep; used when keys absent |
| `providers/booking-provider.module.ts` | rewrite: provide both tokens |

`BookingProviderModule` factory:
- `DUFFEL_API_KEY` set → `DuffelFlightProvider`; else → `MockFlightProvider`
- `LITEAPI_KEY` set → `LiteApiHotelProvider`; else → `MockHotelProvider`

### BookingSearchModal (frontend)

Already imported in `builder/[id].tsx`. Update it to:
- Flights tab: calls `/api/v1/bookings/search?type=flight&...` → Duffel results.
- Hotels tab: calls `/api/v1/bookings/search?type=hotel&...` → LiteAPI results.
- On "Book": `POST /api/v1/bookings` with the offer's `external_ref` + trip_id.
- On success: toast + stop block appears in Planner (stop invalidation key already fixed in
  `useBookings.ts`).

**No IATA hint map needed now** — for flight search we add a city-name input and let Duffel
handle the routing (Duffel accepts IATA codes but we can add a simple APAC hint map the
same as before for UX: user types "Osaka" → we send "KIX").

---

## 6. Planner UI (distinct blocks) — Phase 1 unchanged

The `isLogistics` / `flightStops` / `stayStops` split in `builder/[id].tsx` is already
partially built (in working tree). This is purely frontend, no schema change, low risk.

Additions vs. old plan:
- Each block's **Add** button now has two sub-options: "Search & book" (opens
  `BookingSearchModal`) and "Add from inbox" (opens Inventory screen filtered to that type,
  or shows a prompt to forward email if inventory is empty).
- An **"In your inbox" badge** on the Flights or Stays block header when there are
  unmatched inventory items of that type.

---

## 7. File-by-file

### Backend (`api/`)

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `InventoryItem` model + relations |
| `prisma/migrations/…` | New migration for `inventory_items` table |
| `src/modules/bookings/providers/amadeus.provider.ts` | **Delete** |
| `src/modules/bookings/providers/duffel.provider.ts` | **New** — Duffel flight search + book |
| `src/modules/bookings/providers/liteapi.provider.ts` | **New** — LiteAPI hotel search + book |
| `src/modules/bookings/providers/mock.provider.ts` | Update — split into `MockFlightProvider` + `MockHotelProvider` |
| `src/modules/bookings/providers/booking-provider.ts` | Update — split interface into `FlightProviderApi` / `HotelProviderApi` |
| `src/modules/bookings/providers/booking-provider.module.ts` | Rewrite — provide `FLIGHT_PROVIDER` + `HOTEL_PROVIDER` |
| `src/modules/bookings/bookings.service.ts` | Update — inject both provider tokens |
| `src/modules/ingestion/` | **New module** (all files listed in §4) |
| `src/app.module.ts` | Import `IngestionModule` |
| `.env.example` | Remove `AMADEUS_*`; add `DUFFEL_API_KEY`, `LITEAPI_KEY`, `INBOUND_EMAIL_SIGNING_SECRET`, `ANTHROPIC_API_KEY` |

### Shared (`packages/shared/`)

| File | Change |
|---|---|
| `src/notifications.ts` | Add `'inventory_item'` to `NOTIFICATION_TYPE` |
| `src/bookings.ts` | Add `BookingProvider` value `'email'`; add `BookingConfirmation` type |

### DB client (`packages/db/`)

| File | Change |
|---|---|
| `src/types/database.ts` | Add `InventoryItem` type + mirror `NotificationType` addition |
| `src/hooks/useInventory.ts` | **New** — `useInventory()`, `useMatchInventoryItem()`, `useDismissInventoryItem()` |
| `src/queries/inventory.ts` | **New** — REST calls |
| `src/index.ts` | Export new hooks |

### Frontend (`trailr/`)

| File | Change |
|---|---|
| `app/builder/[id].tsx` | Finish Phase 1 blocks; add "Add from inbox" button; show inbox badge |
| `src/components/BookingSearchModal.tsx` | Update to use Duffel/LiteAPI; add passenger/guest detail fields |
| `app/inventory.tsx` | **New** — list of unmatched inventory items; match-to-trip picker; dismiss |
| `app/notifications.tsx` | Handle `'inventory_item'` type → route to `/inventory` |

---

## 8. Env vars (final state)

```env
# Flights (Duffel)
DUFFEL_API_KEY=""          # Duffel test key (starts with duffel_test_...)

# Hotels (LiteAPI / Nuitée)
LITEAPI_KEY=""             # Sandbox key from liteapi.travel

# Email ingestion
INBOUND_EMAIL_SIGNING_SECRET=""   # HMAC secret shared with inbound email provider
ANTHROPIC_API_KEY=""              # LLM fallback for email parsing (claude-haiku-4-5)
```

Leave blank → full mock mode. No code change to switch providers.

---

## 9. Build phases

| Phase | Scope | Risk | Requires |
|---|---|---|---|
| **1 — Distinct blocks UI** | `builder/[id].tsx` only; finish what's in tree | Low | Nothing |
| **2 — Provider swap** | Delete Amadeus; add Duffel + LiteAPI providers; update `BookingSearchModal` | Medium | Duffel test key + LiteAPI sandbox key (you paste into `api/.env`) |
| **3 — Inventory schema** | `InventoryItem` Prisma model + migration + db-client types | Low | Running DB |
| **4 — Ingestion module** | New NestJS module: webhook endpoint + JSON-LD parser + LLM fallback + notification | Medium | `ANTHROPIC_API_KEY` + inbound email provider (or test via direct POST) |
| **5 — Inventory UI** | New `/inventory` screen + hooks + notifications integration | Low | Phase 3 done |
| **6 — Wire inbox badge into Planner** | Badge count in Flights/Stays block header | Low | Phase 5 done |

Phase 1 is independently shippable. Phases 2 and 3 can run in parallel (different
codebases). Phase 4 depends on 3. Phase 5 depends on 4. Phase 6 depends on 5.

---

## 10. Open questions

1. **Payment in-app:** Duffel sandbox bypasses cards (balance top-up). Production needs
   Duffel Payments or Stripe hand-off. Scope for a follow-up; flag as `// DECISION NEEDED`.
2. **Inbound email provider:** need to pick one (Mailgun, SendGrid, Postmark) and provision
   the `@in.trailr.app` MX records + webhook URL before Phase 4 can work end-to-end.
3. **Anthropic model for LLM parsing:** `claude-haiku-4-5-20251001` is the right call
   (cheapest, fast, JSON-only output). Confirm the prompt template before wiring.
4. **Forwarding address UX:** where does the user find their unique address? Profile screen?
   Inventory screen empty state? Both.
5. **`transport` category:** still in the day timeline (not logistics). No change here.
