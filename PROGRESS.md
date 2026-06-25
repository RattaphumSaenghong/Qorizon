# Trailr — Progress & Handoff

> Last updated: 2026-06-25 (session 3)
> Read this first when resuming. Pairs with `DESIGN_flight_booking_lifecycle.md`,
> `DESIGN_flight_date_lock.md`, `DESIGN_hotel_recs.md`, `DESIGN_explore_stays.md`,
> `DESIGN_book_tab.md`, and `trailr-pricing-ssp-anchor.md` (pricing spec, kept in Downloads).

---

## Where things stand (all committed)

Recent commits on `main`:
- `24ceeee` — docs: flight-booking-lifecycle spec (reviewed + reconciled to shipped code)
- `354ba17` — flight metadata on `stop.meta` + trip-date guard (backend lifecycle)
- `66069aa` — Duffel segment times/airports + flight-date-lock spec
- `a009d7d` — refactor: split the 2.4k-line trip builder into `src/builder/` modules
- `8d36d78` — fix: rates always load for first 40 hotels (stays map bug)
- `ec16038` — Book tab (Flights/Stays) + Saved "Booked" list
- `e8a4fd1` — live LiteAPI hotels: FX, SSP pricing floor, map search & recs UI
- `6c7e091` — bookings refactor, hotel recs engine, search, trip chat, inventory

Tree is clean except `.claude/settings.local.json` (session churn). **Both providers are live** —
sandbox `LITEAPI_KEY` (hotels) and `DUFFEL_API_KEY` (flights) are in `api/.env` (gitignored),
both smoke-tested end-to-end against the real APIs.

## ⭐ Flight booking (Duffel live + lifecycle backend, this session)
- **Duffel live:** key added, restarted, verified — `POST /bookings/search` returns
  `provider:"duffel"`, real `off_…` offers, FX ~33.4 → `amount_thb`. `duffel.provider.ts`
  parses segments → `FlightSummary` (`origin/destination/dep_at/arr_at/carrier/flight_number/stops`)
  + full `segments[]` on `meta`.
- **Lifecycle backend (`354ba17`):** `stop.meta Json?` migration; `flight-itinerary.ts`
  (`extractFlightSummary`, `flightSegmentsFromMeta`, `timeFromIso`, `flightDepartsOutsideTripWindow`);
  booking-create + ingestion-match snapshot the summary onto `stop.meta` + `planned_start/end`;
  date guard rejects flights >±1 day outside the trip window.
- **Spec:** `DESIGN_flight_booking_lifecycle.md` (storage = `stop.meta`; guard reads *incoming*
  `dep_at`; compact-row-vs-rich-detail). Remaining = **frontend display** (`NEXT.md` item 6):
  `flightRowLine`, offer/builder cards, detail-screen per-segment block, ingestion soft-guard.
  ⚠️ Guard is currently **hard on all paths** — ingestion should be soft (regex `dep_time` is flaky).

---

## ⭐ Hotel booking + pricing (DONE, live)

**Pricing — `api/src/modules/bookings/pricing/hotel-pricing.ts`**
- `computeHotelDisplayPrice({ net, ssp })` anchors display price to LiteAPI
  `suggestedSellingPrice` (Booking.com-derived). **Thin spreads sell AT SSP** (never
  suppress/overshoot — decided); `net>ssp` → `net×1.08`; null SSP → `net×1.12`.
- `HOTEL_MARGIN_FLOOR = 0.08` is now a **margin-health flag**, not a price lever (all
  `net≤ssp` rates land on SSP). Only `invalid_net` suppresses.

**FX — `api/src/modules/fx/fx.service.ts`** (`[[trailr-fx-rates]]`)
- `FxService.usdToThb()` — Frankfurter, ECB daily, 12h cache, fallback `BOOKING_USD_THB_RATE`
  (36). Used by LiteAPI + Duffel providers + ingestion. Real rate ~33.2 (was 8% off at 36).

**LiteAPI provider — `liteapi.provider.ts`** (two-call flow, verified live)
- `searchHotelCatalog` → `GET /data/hotels?latitude&longitude&radius=<METERS>&limit` (pins, no price).
- `searchHotelRates` → `POST /hotels/rates {hotelIds, checkin, checkout, occupancies, currency:'USD', margin:0}`
  → map `net=offerRetailRate.amount`, `ssp=suggestedSellingPrice.amount` (per-stay totals) →
  pricing floor → THB via FX. Picks cheapest offer per hotel.
- Endpoints: `GET /hotels/catalog`, `POST /hotels/rates` (clamped radius 250–20k, limit 1–100).
- Mock provider implements both for keyless dev. Tokyo catalog = 5,465 hotels.

**Recs engine — `recommendations.service.ts`**
- Now fetches candidates via `searchHotelCatalog` around the itinerary **medoid** (radius from
  stop spread) + `searchHotelRates`, merged by `hotel_id`. Scoring/transit unchanged.
- `GET /trips/:id/hotel-recommendations`. Verified live: 5 real Tokyo stays, SSP-priced THB,
  Mapbox stations, correct budget cap.

**Frontend**
- `HotelRecsSheet` + "Suggest stays" in the builder Stays block (`[[trailr-hotel-recs]]`).
- **Book tab** (5th tab) — `app/(tabs)/book.tsx` landing → `app/book/flights.tsx` (Duffel/mock
  flight search) + `app/book/stays.tsx` (the LiteAPI map browser, moved from `explore-stays.tsx`).
- **Saved → `Saved | Booked` segment** — Booked reads `useBookings()`, **display-only cards**
  (no per-booking detail screen exists; `booking/[id]` is a trip-scoped booking flow).

---

## Open / deferred
- **Per-booking detail screen — DONE.** `app/booking/view/[id].tsx` + `useBooking(id)` +
  `GET /bookings/:id` shipped; Saved→Booked tap re-enabled. ⚠️ Its flight branch reads **stale**
  `meta.route/airline/depart_date` — fixed by `NEXT.md` item 6 (Duffel meta shape changed under it).
- **Flight display frontend** (`NEXT.md` item 6) — backend shipped, UI still shows raw
  `offer.subtitle` (`PT6H7M`). See `DESIGN_flight_booking_lifecycle.md` §7 "Remaining".
- **Builder refactored** (`a009d7d`): `app/builder/[id].tsx` 2387→1588 lines; leaf components,
  styles, helpers extracted to `src/builder/` (kept out of `app/` so expo-router won't route them).
- **Browser-tested** (`8d36d78`): map renders, place search, "Search this area" → catalog pins,
  rates load for first 40 hotels, price labels on pins, HotelDetailSheet with live price + Book.
  LiteAPI rejects radius <~1000m (returns 400); minimum clamped to 250 in service but LiteAPI
  enforces its own floor — effectively ~1km minimum works in practice.
- **Per-night vs per-stay:** LiteAPI net/ssp are per-stay totals (same basis) — units bug avoided.
- Dead `LITEAPI_KEY` line in `trailr/.env.local` (gitignored, harmless — frontend never reads it).
- `flights.tsx` re-implements `DateField` (also in `BookingSearchModal`) — DRY later.
- **MoR / payments:** LiteAPI User-Payment SDK not wired (current `bookHotel` = prebook/confirm).

---

## Stack & run
- Frontend: Expo Router (RN/web) at `trailr/` (Expo SDK ~56 — read versioned docs before RN code).
- Backend: NestJS + Prisma at `api/` — runs **compiled dist**, not watch. After API changes:
  `npm run build` in `api/` (and `packages/shared` if enums change), then
  `node --enable-source-maps dist/src/main.js` from `api/`. Login: somchai@trailr.app / password123.
- `@trailr/db` is source-only (consumed by trailr); typecheck via `npx tsc --noEmit` in `trailr/`.
