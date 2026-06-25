# Design — Explore Stays (Map-Driven Hotel Search)

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Pairs with:** `DESIGN_hotel_recs.md` (the "for you" recs feed), `DESIGN_bookings.md`
> (the book flow), `trailr-pricing-ssp-anchor.md` (the SSP pricing floor every price runs through).

---

## 1. What & why

An **interactive, map-driven** hotel browser — distinct from the automatic recommendations
feed. The user drives it:

1. Types a location → Mapbox **flies** the map there.
2. Pans / zooms to frame an area.
3. Taps **"Search this area"** → we load hotels inside the current viewport.
4. **Zoom decides density:** zoomed out → clustered counts (cheap, no prices); zoomed in →
   individual **priced** pins.
5. Taps a pin → detail sheet → **Book** (existing flow) or **Add to trip**.

This is the *explore-it-myself* surface. The recs feed answers "best stays for this trip";
Explore answers "show me what's around here."

---

## 2. Relationship to the recs feed — one provider call, two callers

| | **"For you" recs feed** (`DESIGN_hotel_recs.md`) | **Explore Stays** (this doc) |
|---|---|---|
| Trigger | "Suggest stays" button, automatic | user types / pans / zooms + **"Search this area"** |
| Center | itinerary **medoid** anchor | **map viewport** center |
| Radius | from stop spread | from map zoom (viewport size) |
| Output | top ~5, scored & ranked | all hotels in view, browsable |

Both reduce to the **same backend primitive**: *hotels near a coordinate, within a radius.*
Implementing it **also fixes the recs feed**, whose current provider call hits the wrong
endpoint (see §3). Build the backend once; both surfaces consume it.

---

## 3. Verified LiteAPI facts (live against sandbox, 2026-06-25)

- **Catalog — `GET /data/hotels`** supports coordinate search:
  `?latitude=&longitude=&radius=<METERS>&limit=`. **Radius is in metres** (`radius=3000` OK;
  `radius=3` → 400). Returns `{ data: [{ id, name, latitude, longitude, stars, rating,
  reviewCount, address, currency, main_photo, … }] }`. **No prices.** Cheap. Tokyo = 5,465 hotels.
- **Rates — `POST /hotels/rates`** body
  `{ hotelIds: string[], checkin, checkout, occupancies: [{ adults }], currency, guestNationality, margin: 0 }`
  → `{ data: [{ hotelId, roomTypes: [{ offerId, suggestedSellingPrice, offerRetailRate,
  offerInitialPrice, … }] }] }`. **Prices live here.** Heavy (up to ~200 offers per hotel).
- **The current `LiteApiHotelProvider.searchHotels` is broken** — it calls a single
  `GET /hotels?cityName=…&margin=0`, which returns **200 with an empty body**. Replace it.
- **Field mapping (with `margin: 0`):**
  - `net` = `roomTypes[].offerRetailRate.amount` (our cost)
  - `ssp` = `roomTypes[].suggestedSellingPrice.amount` (OTA-derived; `source` was `"booking.com"`)
  - `offer_id` = `roomTypes[].offerId` (long token → feeds `bookHotel`)
  - `currency` = `offerRetailRate.currency` (USD on sandbox)
  - These are **per-stay totals**, not per-night. Same basis for net & ssp → the per-night/
    per-stay mixing risk is gone. Divide by `nights` for a nightly figure in the UI.

---

## 4. Backend

### 4.1 Split the provider into two coordinate-based methods

`api/src/modules/bookings/providers/booking-provider.ts` — extend `HotelProviderApi`:

```ts
export interface HotelCatalogQuery { latitude: number; longitude: number; radiusM: number; limit?: number; }
export interface HotelPin {
  hotel_id: string; name: string; latitude: number; longitude: number;
  rating: number | null; stars: number | null; thumbnail?: string;
}
export interface HotelRatesQuery { hotelIds: string[]; check_in: string; check_out: string; adults?: number; }
// reuse BookingOffer for priced results (already carries amount_thb, latitude, longitude, meta)

export interface HotelProviderApi {
  readonly name: string;
  searchHotelCatalog(q: HotelCatalogQuery): Promise<HotelPin[]>;   // cheap, pins only
  searchHotelRates(q: HotelRatesQuery): Promise<BookingOffer[]>;   // heavy, priced
  bookHotel(rateId: string, guest?: GuestDetails): Promise<BookingConfirmation>;
}
```

- **`LiteApiHotelProvider.searchHotelCatalog`** → `GET /data/hotels?latitude&longitude&radius=radiusM&limit`.
- **`LiteApiHotelProvider.searchHotelRates`** → `POST /hotels/rates` with `hotelIds`, dates,
  `occupancies:[{adults}]`, `currency:'USD'`, `guestNationality` (default e.g. `'US'`), `margin:0`.
  For each hotel take the **cheapest** offer; map net/ssp/offerId per §3; run
  `computeHotelDisplayPrice({ net, ssp })`; `toThb(displayPrice, currency, usdThb)` via `FxService`.
  Keep the rich `meta.pricing` block (net, ssp, basis, flags, display_price) already added.
- **`MockHotelProvider`** must implement both too (keyless dev) — return a few deterministic
  pins near the query coord + mock priced offers.

> The recs `RecommendationsService` switches from the old `searchHotels({ city })` to
> `searchHotelCatalog` (around the medoid, radius from spread) → then `searchHotelRates`
> for those hotel IDs. That's the §2 unification — do it in the same PR.

### 4.2 API endpoints

`HotelSearchController` (new, or fold into bookings):

| Method | Route | Returns | Cost |
|---|---|---|---|
| `GET` | `/hotels/catalog?lat=&lng=&radius=&limit=` | `HotelPin[]` | cheap |
| `POST` | `/hotels/rates` body `{ hotelIds, check_in, check_out, adults }` | `BookingOffer[]` (priced, THB) | heavy |

Authenticated user (JWT). Clamp `radius` server-side (e.g. ≤ 20 000 m) and `limit` (e.g. ≤ 100)
so a zoomed-out call can't pull thousands.

---

## 5. Frontend — Explore Stays screen

New route: **`trailr/app/explore-stays.tsx`** (standalone screen). Optionally trip-scoped via
`?tripId=` so a hotel can be **Added to trip**; works without a trip too (pure browse).

### 5.1 Layout
- Full-bleed **`MapView`** (reuse existing native + web components).
- **Search box** pinned top — reuse `usePlaceSuggestions` / `suggestPlaces` / `retrievePlace`
  (same Mapbox autocomplete the builder already uses).
- **"Search this area"** floating button — hidden until the map has moved since the last search.
- **Result pins** (clustered when many) + a **hotel detail sheet** on tap.

### 5.2 Flow
1. Open (seed center from `tripId` anchor if present, else last/global default).
2. Type location → suggestions → pick → `retrievePlace` → **map `flyTo`** center + a city zoom.
3. User pans/zooms → "Search this area" appears.
4. Tap it → read viewport **center + radius** (§5.3) → `GET /hotels/catalog` → drop pins.
5. **Zoom-driven prices** (§5.4): if visible pin count ≤ `PRICE_THRESHOLD` → `POST /hotels/rates`
   for the visible hotel IDs → show **price labels** on pins; else show clusters/counts only.
6. Tap pin → detail sheet (name, ★rating, ฿price/night, distance) → **Book** (existing
   `useCreateBooking`) or **Add to trip** (drop a `hotel` stop, if `tripId`).

### 5.3 Viewport → center + radius
- `center` = current map center.
- `radiusM` = haversine(center → a viewport corner) in metres (a circle that covers the
  visible rectangle, slight overscan). Clamp to a max (e.g. 20 000 m).

### 5.4 Zoom-driven behaviour (implements "depends on how zoomed in")
- **Catalog pins always** (cheap) on every "Search this area".
- **Prices only when `visibleCount ≤ PRICE_THRESHOLD`** (start ~40) — batch one
  `POST /hotels/rates` for the visible IDs. Above that, clusters/counts only.
- Cluster pins when dense (see §10 — confirm `MapView` clustering support).

### 5.5 "Search this area" button
- Tracks "moved since last search" (on map move-end, set a dirty flag).
- Visible only while dirty; tap → search → clear flag. Keeps API calls user-initiated (cheaper).

---

## 6. Client (`packages/db`)
- **types** (`types/database.ts`): `HotelPin`, `HotelCatalogQuery`, `HotelRatesQuery` (reuse `BookingOffer` for priced).
- **queries** (`queries/hotel-search.ts`): `searchHotelCatalog(q)`, `searchHotelRates(q)`.
- **hooks** (`hooks/useHotelSearch.ts`): `useHotelCatalog(q, enabled)` (enabled = false, fire on
  button via `refetch`), `useHotelRates(hotelIds, dates, enabled)`.
- Export from `index.ts`.

---

## 7. File-by-file

### Backend (`api/`)
| File | Action |
|---|---|
| `modules/bookings/providers/booking-provider.ts` | add `searchHotelCatalog` / `searchHotelRates` + types |
| `modules/bookings/providers/liteapi.provider.ts` | **rewrite** to the two-call coord flow (§3/§4.1) |
| `modules/bookings/providers/mock.provider.ts` | implement both methods (coord-based mock) |
| `modules/bookings/hotel-search.controller.ts` | **new** — `GET /hotels/catalog`, `POST /hotels/rates` |
| `modules/recommendations/recommendations.service.ts` | switch to catalog+rates around the medoid |

### Shared / DB
| File | Change |
|---|---|
| `packages/db/src/types/database.ts` | `HotelPin`, query types |
| `packages/db/src/queries/hotel-search.ts` | **new** |
| `packages/db/src/hooks/useHotelSearch.ts` | **new** |
| `packages/db/src/index.ts` | export both |

### Frontend (`trailr/`)
| File | Change |
|---|---|
| `app/explore-stays.tsx` | **new** — the screen |
| `src/components/HotelDetailSheet.tsx` | **new** — pin tap → detail + Book / Add to trip |
| `src/components/MapView/*` | expose viewport bounds + `onMoveEnd` (see §10) + hotel pin layer |
| entry point (e.g. `TopBar` / a trip action) | link into `/explore-stays` |

---

## 8. Cost / quota notes
- Catalog is cheap; **rates is the expensive call** — gate it behind the button **and** the
  zoom threshold. Never price hotels the user can't see.
- One `POST /hotels/rates` for the whole visible set (batch hotelIds), not one call per hotel.
- Consider a short in-memory cache keyed on rounded (lat,lng,radius) so re-tapping the same
  area doesn't re-hit LiteAPI (mirror `MapboxService`'s cache).

---

## 9. Open decisions / TODO
- [ ] **`MapView` viewport access** — confirm the native (`react-native-maps`?) and web
      (`react-map-gl`) components both expose **bounds + center + `onMoveEnd`**. This is the
      biggest implementation unknown; verify before building §5.3.
- [ ] **Clustering** — does the current `MapView` support marker clustering, or add a lib?
- [ ] `PRICE_THRESHOLD` (start 40) and max `radiusM` (start 20 000) — tune live.
- [ ] Occupancy: default `adults: 2`; expose a guest selector later (no headcount on `Trip`).
- [ ] `guestNationality` default for the rates call (affects taxes/availability) — pick a default.
- [ ] Is Explore always trip-scoped, or also a global entry point (no trip)? Spec supports both.
- [ ] Currency: rates come USD on sandbox → FX to THB via `FxService`; confirm prod currency.

---

## 10. Phases
| Phase | Scope |
|---|---|
| **1 — Backend** | coord `searchHotelCatalog` + `searchHotelRates` + endpoints; rewrite LiteAPI provider; switch recs feed onto it (fixes the feed) |
| **2 — Explore shell** | screen + map + place search + "Search this area" → catalog pins (no prices) |
| **3 — Prices on zoom** | rates for visible set when `count ≤ threshold`; price labels |
| **4 — Detail + book** | `HotelDetailSheet` → Book / Add to trip |
| **5 — Polish** | clustering, caching, radius/threshold tuning |

Phase 1 is the keystone — it unblocks both Explore *and* the existing recs feed.
