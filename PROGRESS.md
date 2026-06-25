# Trailr — Progress & Handoff

> Last updated: 2026-06-25
> Read this first when resuming. Pairs with `DESIGN_hotel_recs.md`, `DESIGN_explore_stays.md`,
> `DESIGN_book_tab.md`, and `trailr-pricing-ssp-anchor.md` (pricing spec, kept in Downloads).

---

## Where things stand (all committed)

Recent commits on `main`:
- `ec16038` — Book tab (Flights/Stays) + Saved "Booked" list
- `e8a4fd1` — live LiteAPI hotels: FX, SSP pricing floor, map search & recs UI
- `6c7e091` — bookings refactor, hotel recs engine, search, trip chat, inventory

Tree is clean except `.claude/settings.local.json` (session churn). **LiteAPI is live** —
sandbox `LITEAPI_KEY` is in `api/.env` (gitignored). Smoke-tested end-to-end against the real API.

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
- **No per-booking detail screen.** Tapping a Booked card does nothing by design. If wanted,
  add `booking/view/[id]` reading one `BookingRow` (distinct from trip-scoped `booking/[id]`).
- **Not browser-tested:** Explore/Book map UI (pan/zoom, "Search this area", pin→sheet, tab
  clicks). Typecheck + API-data smoke pass; Expo preview run was declined.
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
