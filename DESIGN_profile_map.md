# Design — Profile Travel Map (real data)

> Status: **PLAN ONLY — not implemented.**
> Goal: make the profile **Map** tab show the user's *actual* travels instead of
> hardcoded fake pins. Decided alongside: the home feed keeps its current behavior
> (your own content does **not** appear in your own feed) — the profile map is where
> a user sees their own footprint.

---

## 1. Current state (what's fake)

`trailr/app/profile/[username].tsx` → `TravelMap()` is entirely hardcoded:

- `TRAVEL_PINS` — 14 hand-written cities with flag emojis (BKK, TYO, Bali, LHR…).
- `PIN_POSITIONS` — hand-tuned `x%`/`y%` overlay positions painted on top of a static
  map tile (the comment admits they're "approximate… until we swap in the interactive SDK").
- `mapStats` — hardcoded **"14 countries · 38 cities"**.

It renders the real `<MapView>` but ignores it — pins are absolutely-positioned
`TouchableOpacity`s layered over the tile, not real geo markers. Same for every user:
your profile and a stranger's show the identical 14 fake pins.

## 2. What already exists (so this is mostly deletion + rewiring)

- **Data is ready.** `useUserPosts(profile.id)` → `GET /users/:id/posts` →
  `getUserPosts()` already returns the user's **visited** stops as `StopWithMedia[]`,
  each with `latitude` / `longitude` / `location_name` / `media` / `trip_id`.
  - **Visibility is already enforced server-side:** own profile sees all visited
    stops; other people see only stops from `public`/`followers` trips
    (`stops.service.ts:50`). No backend change needed.
  - It's **already fetched** on the profile screen for the Posts tab (`postsQ.data`) —
    the Map tab can reuse the same query, no extra request.
- **Real map rendering is a solved pattern.** The Feed and Builder pass real pins to
  `<MapView posts={[{ id, latitude, longitude, location, caption, onPress }]} />`
  (see `app/(tabs)/index.tsx`). The profile map just needs to do the same.

## 3. Design — v1 (real pins: visited + planned)

> **Decisions locked (2026-06-21):** photo-thumbnail pins for visited stops; planned
> stops shown too but **gray / muted / "lifeless"** so they read as not-yet-been;
> stat pill = **"N places · M trips"**.

Rewrite `TravelMap` to plot the user's real stops — visited *and* planned — for real.

**Two pin styles (the core visual idea):**

| Stops | Status | Pin look | Meaning |
|---|---|---|---|
| **Visited** | `visited` | **Photo-thumbnail marker** — round/rounded pin showing the stop's first photo, terracotta ring. Vibrant, "alive." | Places you've actually been. |
| **Planned** | `planned` | **Gray plain marker** — muted/desaturated `ti-map-pin`, no photo, low-saturation gray (e.g. `#B4B2A9`), maybe a dashed/lighter ring. Distinct and lifeless. | Upcoming, not yet visited. |

Photos on visited pins come from `s.media?.[0]?.cdn_url ?? s.media?.[0]?.url`; planned
stops typically have no media, which is why they fall back to the gray marker anyway —
the styling just makes that difference intentional and legible.

**Signature:** `TravelMap({ stops, isOwn }: { stops: StopWithMedia[]; isOwn: boolean })`
— `stops` is visited + planned (see §3a for the data source). Build `MapView` pins from
those with coordinates; choose the marker style from `s.status`. Tap a pin → that trip's
journal (`/journal/${s.trip_id}`), same affordance as the feed map.

**Initial camera:** center on the centroid (or first pin) and pick a zoom that fits the
spread; fall back to the world view (`lng 80, lat 20, zoom 2`) when there are no pins.
(Use a fit-bounds/`center` prop if `MapView` exposes one; else centroid + heuristic zoom.)

**Stats overlay:** replace fake "14 countries · 38 cities" with **"N places · M trips"**:
- `places` = count of **visited** stops with coords (the footprint — planned don't count
  as places you've "been").
- `trips` = distinct `trip_id` across the shown stops.
- **Countries/cities are intentionally NOT shown** — stops have no country field and
  reverse-geocoding is out of scope (see §5). Don't show a number we can't back.

**Empty state:** no pins →
- own profile: "No places pinned yet — your visited stops will appear here."
- other profile: "Hasn't shared any places yet."

**Delete:** `TRAVEL_PINS`, `PIN_POSITIONS`, the manual pin `TouchableOpacity` loop, and
the now-unused styles (`travelPin`, `travelPinEmoji`). Keep `mapContainer`, `travelMap`,
`mapStats`/`mapStatsText`; add styles for the photo pin + gray planned pin.

### 3a. Data source — needs a small backend add

The existing `useUserPosts` returns **visited only**, so including planned stops requires
one of:
- **(preferred) New read:** `GET /users/:id/map-stops` → visited + planned stops with
  coords, visibility-enforced the same way `getUserPosts` already does
  (`viewerId === targetId` sees all; others see only `public`/`followers` trips). Returns
  `StopWithMedia[]` carrying `status` so the client picks the pin style. New
  `useUserMapStops(userId)` hook + `fetchUserMapStops` query in `packages/db`.
- **(lighter) Param:** add `?status=all` (or `?include=planned`) to the existing
  `/users/:id/posts` endpoint. Less new surface, but muddies the "posts = visited" meaning.

Recommend the dedicated `map-stops` endpoint — keeps the Posts grid (visited-only) and the
Map (visited + planned) cleanly separate.

## 4. File-by-file (v1)

| File | Change |
|---|---|
| `api/src/modules/stops/stops.service.ts` | Add `getUserMapStops(viewerId, targetId)` — like `getUserPosts` but `status: { in: ['visited','planned'] }`, same visibility guard. |
| `api/src/modules/stops/stop-reads.controller.ts` | Add `@PublicRead() @Get('users/:id/map-stops')` → `getUserMapStops`. |
| `packages/db/src/queries/stops.ts` | Add `fetchUserMapStops(userId)` → `GET /users/:id/map-stops`. |
| `packages/db/src/hooks/useUser*.ts` (or stops hooks) | Add `useUserMapStops(userId)`; export from `packages/db/src/index.ts`. |
| `trailr/app/profile/[username].tsx` | Rewrite `TravelMap` to accept `stops` + `isOwn`; photo-thumbnail pins for visited, gray markers for planned; derive "N places · M trips"; empty state. Wire `useUserMapStops(profile.id)` and pass its data where `<TravelMap />` renders (line ~450). Delete `TRAVEL_PINS`, `PIN_POSITIONS`, manual overlay + dead styles. |

No schema or migration changes — `planned`/`visited` and coordinates already exist on `Stop`.

## 5. Phase 2 — optional enhancements (only if wanted later)

- **Visited-city clustering:** group nearby pins (e.g. within ~25 km) into one marker with
  a count, so 8 Kyoto stops read as one "Kyoto ×8" pin. Needs a small client-side cluster
  helper (or a clustering layer in `MapView`).
- **Country / city counts:** to honestly show "N countries", add a coarse offline
  lat/lng→country lookup (bounding boxes or a tiny geo dataset) or store a `country_code`
  on stops at creation. Defer — not worth a network dependency for a stat.
- **Per-trip route lines:** draw the route polyline per trip (like the builder map) so the
  map reads as journeys, not just dots. *(Partly shipped: web map draws a trip's trail on
  pin hover.)*
- **Year filter:** chips to filter the map by trip year.
- **Toggle visited/planned:** a control to show/hide the gray planned pins.
- **Native map pins (deferred 2026-06-21):** the native `MapView` (`index.tsx`) is a static
  Mapbox image and ignores `posts`, so the travel map shows no pins on iOS/Android — pins
  are **web-only** for now. Decision: defer until the real native build, then swap in
  `@rnmapbox/maps` (Option B) for interactive parity rather than projecting pins onto the
  static image (Option A — approximate, no pan/zoom). The app is currently run/tested on web.

## 6. Decisions (resolved 2026-06-21)

1. **What to plot:** ✅ Visited **and** planned. Planned pins are **gray / muted /
   "lifeless"** to read as not-yet-visited; visited pins are vibrant photo-thumbnails.
2. **Stat wording:** ✅ **"N places · M trips"** (places = visited count; trips = distinct
   trips). Countries/cities deferred to Phase 2 (no faked number).
3. **Pin style:** ✅ **Photo-thumbnail pins** for visited stops (first photo inside the
   marker); gray plain markers for planned.

Still open / Phase 2: clustering, country counts, route lines, year filter, visited/planned
toggle (§5).
