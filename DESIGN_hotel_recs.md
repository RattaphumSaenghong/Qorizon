# Design — Trip-Aware Hotel Recommendations

> **Status:** PLAN ONLY — not implemented.
> **Pairs with:** `DESIGN_bookings.md` (provides the LiteAPI hotel provider + book flow this
> feature ranks and feeds into). This feature is the *smart search* in front of Path B.

---

## 1. What & why

Recommend stays scored against the **user's own itinerary**, not a blank city search. Three
dimensions:

1. **Close to their planned attractions** — we own the itinerary (`Stop` lat/lng).
2. **Near transit** — for train-led trips, prefer hotels close to a rail/metro station.
3. **Fits their budget** — derive a nightly cap from `Trip.budget` + dates.

The differentiator is #1 + #3 (nobody else has the user's itinerary). #2 (transit) is table
stakes but cheap once a station source is wired. We build all three (Option 2 chosen).

---

## 2. Data inputs

| Input | Source | Status |
|---|---|---|
| Attraction coords | `Stop.latitude/longitude`, `category` ('place' etc.) | ✅ exists |
| Trip budget + nights | `Trip.budget`, `start_date`, `end_date` | ✅ exists |
| Candidate hotels (price, rating, coords) | `HotelProviderApi.searchHotels` (Mock now, LiteAPI later) | ⚠️ mock only today |
| Station locations | **Mapbox** Tilequery (`mapbox-streets-v8`, `transit_stop_label`) | ❌ new integration |
| Transport mode | **new** `Trip.transport_mode` field | ❌ new field |

---

## 3. The engine

Lives in a new `RecommendationsService` (own module; depends on `HOTEL_PROVIDER`,
a new `MapboxService`, and `PrismaService`).

### 3.1 Anchor — geographic center of the attractions
- Collect attraction stops with non-null coords (exclude `hotel`/`flight`/`transport`).
- **Use the medoid** (the stop with the smallest summed distance to all others), NOT the
  centroid. A plain mean can land between two clusters (in a river / the sea) and recommend
  a hotel near nothing; the medoid is always a real attraction.
- If <2 usable stops → no recommendation (UI gates the button on this anyway).

### 3.2 Multi-area guard
- Compute the max pairwise distance among attractions. If it exceeds `SPREAD_THRESHOLD_KM`
  (~25 km), the trip spans areas a single hotel can't serve → return a
  `multiArea: true` flag, no ranked list. (Per-area clustering is **v2**, out of scope here.)

### 3.3 Candidate fetch
- `searchHotels({ lat, lng, radius: SEARCH_RADIUS_KM, checkIn, checkOut, guests })`.
- Radius ~ derived from how spread the attractions are, clamped to e.g. 1–8 km.

### 3.4 Transit lookup (Mapbox)
- Only when `transport_mode` ∈ {`train`, `transit`, `mixed`} (skip the calls entirely for
  `car`/`walk` — saves quota and they don't care about stations).
- For each candidate hotel: Tilequery at the hotel's coords, `radius = STATION_RADIUS_M`
  (~1200 m), `layers=transit_stop_label`, keep features whose `mode` is rail-like
  (`rail`, `metro_rail`, `light_rail` — verify exact values vs. live docs).
- Take nearest qualifying station → `stationMeters` + `stationName`.
- **Batch + cache:** dedupe by rounded coords; cache results in-process (stations don't move).

### 3.5 Scoring
Each sub-score normalized to 0–1, then weighted sum → `score`:

```
attractionScore = clamp(1 - avgKmToStops / ATTR_MAX_KM, 0, 1)      // closer to sights = higher
budgetScore     = nightly <= cap ? 1 : clamp(1 - (nightly-cap)/cap, 0, 1)  // hard over-penalty
ratingScore     = providerRating / 5
transitScore    = transitActive ? clamp(1 - stationMeters / STATION_MAX_M, 0, 1) : 0

score = wA*attractionScore + wB*budgetScore + wR*ratingScore + wT*transitScore
```
- Weights default: `wA .40, wB .25, wT .25, wR .10`. When transit is off, redistribute
  `wT` into `wA` (so a car trip ranks purely on sights/budget/rating).
- Nightly cap = `Trip.budget * LODGING_FRACTION (0.35) / nights`, **editable** in the sheet
  (total budget covers flights/food too — the auto value is a starting guess, not truth).

### 3.6 Output
Top `N` (≈5), each:
```ts
{ hotelId, name, lat, lng, nightlyThb, rating, score,
  avgKmToStops, stationName?, stationMeters?,
  why: "avg 1.2 km to your 5 sights · 4 min walk to Shinjuku Stn · ฿2,400/night, under budget · ★4.3" }
```

---

## 4. Mapbox integration

New `api/src/modules/maps/mapbox.service.ts`:
- `MAPBOX_TOKEN` env var (blank → transit scoring disabled, engine still runs on the other
  three dimensions — graceful degradation, same philosophy as the mock providers).
- `nearestStation(lat, lng): Promise<{ name?: string; meters: number } | null>` via Tilequery.
- In-memory LRU cache keyed on coords rounded to ~4 dp.

---

## 5. New field: `Trip.transport_mode`

```prisma
transport_mode String @default("mixed")  // 'train' | 'transit' | 'car' | 'walk' | 'mixed'
```
- Set in `new-trip.tsx` (a small selector) and editable in `TripSettingsMenu`.
- Migration + mirror in `packages/shared` enums + `packages/db` types.
- Default `mixed` → transit scoring on (safe default for an APAC train-heavy audience).

---

## 6. API surface

`GET /api/v1/trips/:id/hotel-recommendations?checkIn=&checkOut=&guests=&nightlyCap=`
→ owner/collaborator only (reuse `policy.assertCanReadTrip`).
Returns `{ multiArea: boolean, anchor: {lat,lng}, items: Recommendation[] }`.

`checkIn`/`checkOut` default to `Trip.start_date`/`end_date`; `nightlyCap` defaults to the
derived value. Booking itself reuses the existing `POST /api/v1/bookings` flow unchanged.

---

## 7. Frontend surface

- **Stays block** (builder) gets a **"Suggest stays"** button, enabled once ≥2 attraction
  stops have coords + dates are set.
- Opens `HotelRecsSheet`: editable nightly cap, sort toggle
  (**Best value** / **Closest to sights** / **Nearest station**), ranked cards each showing
  the `why` line + a map dot relative to their pins.
- Card "Book" → existing LiteAPI book flow (Path B). Card "Add to day" can drop a `hotel`
  stop without booking (manual stay).

---

## 8. File-by-file

### Backend (`api/`)
| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `Trip.transport_mode` + migration |
| `src/modules/maps/mapbox.service.ts` | **New** — Tilequery nearest-station + cache |
| `src/modules/maps/maps.module.ts` | **New** |
| `src/modules/recommendations/recommendations.service.ts` | **New** — anchor, multi-area, scoring |
| `src/modules/recommendations/recommendations.controller.ts` | **New** — `GET /trips/:id/hotel-recommendations` |
| `src/modules/recommendations/recommendations.module.ts` | **New** — imports Maps + BookingProvider modules |
| `src/app.module.ts` | Import the two new modules |
| `.env.example` | Add `MAPBOX_TOKEN` |

### Shared (`packages/shared/`)
| File | Change |
|---|---|
| `src/trips.ts` | `transport_mode` on Trip types; `TransportMode` enum |
| `src/recommendations.ts` | **New** — `Recommendation`, request/response types |

### DB client (`packages/db/`)
| File | Change |
|---|---|
| `src/types/database.ts` | `transport_mode` on Trip |
| `src/queries/recommendations.ts` | **New** — REST call |
| `src/hooks/useHotelRecommendations.ts` | **New** |
| `src/index.ts` | Export |

### Frontend (`trailr/`)
| File | Change |
|---|---|
| `app/new-trip.tsx` | transport_mode selector |
| `src/components/TripSettingsMenu.tsx` | edit transport_mode |
| `src/components/HotelRecsSheet.tsx` | **New** — the ranked sheet |
| `app/builder/[id].tsx` | "Suggest stays" button in Stays block |

---

## 9. Phases

| Phase | Scope | Depends on | Status |
|---|---|---|---|
| **1 — Scoring engine (mock data)** | `RecommendationsService` w/ anchor + multi-area + attraction/budget/rating scoring; endpoint; tested against `MockHotelProvider` | Nothing | ✅ done (typechecks; not yet HTTP-smoke-tested) |
| **2 — transport_mode** | Field + migration + new-trip/settings UI | Phase 1 | ✅ done (user-built; migration deployed) |
| **3 — Mapbox transit** | `MapboxService` + `transitScore` wired in | `MAPBOX_TOKEN`, Phase 2 | ✅ done (Tilequery verified live; not yet HTTP-smoke-tested) |
| **4 — Recs sheet UI** | `HotelRecsSheet` + "Suggest stays" button + sort toggle | Phase 1 (3 for transit sort) | ⬜ not started |
| **5 — Real hotels** | Lights up automatically when bookings Phase 2 wires `LiteApiHotelProvider` | bookings DESIGN Phase 2 | ⬜ pending `LITEAPI_KEY` |

Phase 1 is independently demoable on mock data. Transit (3) and real hotels (5) slot in
without touching the engine.

### Verified Mapbox facts (live, 2026-06-21, near Shinjuku)
- Tilequery `layers=transit_stop_label` returns `mode` ∈ {`rail`, `metro_rail`, `bus`, …};
  `RAIL_MODES` keeps rail/metro_rail/light_rail/monorail, drops bus.
- Distance is `properties.tilequery.distance` (metres).
- **`stop_type` matters:** `entrance` rows are closest but named like "Exit 3"; the real name
  is on the `station` row (e.g. `新宿`). Engine prefers nearest `station`, falls back to
  nearest rail access point (generic "a station") for distance only.
- `limit=50` needed so dense `entrance` rows don't crowd out the `station` node (Shinjuku in
  range: 33 entrances vs 2 stations).

---

## 10. Open questions / decisions

1. **`LODGING_FRACTION` default (0.35)** — guess; revisit once we see real budgets. Editable cap mitigates.
2. ~~**Mapbox property names**~~ — RESOLVED, verified live (see "Verified Mapbox facts" above).
3. **Guests count** — no `Trip` field for headcount; default 2, let the sheet override. (Could derive from `TripMember` count later.)
4. **Caching stations across requests** — in-process LRU for v1; a DB-backed station cache is a later optimization if quota bites.
5. **Multi-area clustering (v2)** — k-means / DBSCAN over stop coords → one rec per cluster-night-span. Deferred.
