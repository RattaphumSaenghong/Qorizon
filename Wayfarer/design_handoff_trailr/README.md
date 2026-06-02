# Handoff: Trailr — Wireframes (Tablet / iPad Planning)

## Overview
Trailr is a travel social platform (Thai Gen Z / Millennial, global from day one) that combines a
location-embedded social feed, a Canva-style trip blueprint editor, a GPS auto-album, a live trail
mode, and one-click flight + hotel booking. See `TRAILR_ARCHITECTURE.md` for the full product/tech
spec and database schema — it is the source of truth for data models and feature behavior.

This bundle covers the **tablet / iPad planning** layouts (landscape, two-pane friendly) for six flows,
explored as multiple distinct structural approaches each:

1. **Home Feed** — location-embedded social feed (Instagram-referenced) · 3 approaches
2. **Trip Journal** — tapping a post opens the whole trip as a journal/trail · 3 approaches
3. **Trip Builder** — Canva-style blueprint editor · 3 approaches
4. **GPS Auto-Album** — photos auto-grouped by GPS + time · 2 approaches
5. **One-Click Booking** — flights + hotels (Amadeus / Agoda / Booking.com) · 2 approaches
6. **Profile / Trip Cards** — forkable trips + social graph · 2 approaches

## About the Design Files
The files in this bundle are **design references created in HTML/React (JSX)** — wireframe prototypes
showing intended **structure, information architecture, and flow**. They are **not production code to
copy directly**. The task is to **recreate these layouts in Trailr's target environment** using its
established patterns and libraries:

- **Mobile / Tablet:** React Native + Expo + Expo Router, Mapbox GL RN, React Query, Zustand
- **Web:** Next.js 14 + Tailwind + Mapbox GL JS

These wireframes are platform-agnostic; implement them with the real stack and design system rather
than porting the HTML.

## Fidelity
**LOW-FIDELITY (lofi).** These are intentionally rough, hand-drawn wireframes (sketch borders,
striped placeholders, handwritten font, a single warm accent). Use them as a guide for **layout,
component placement, hierarchy, and user flow** — then apply Trailr's real design system for color,
type, spacing, and final styling. Do **not** treat the colors/fonts below as the product's brand;
they are wireframe scaffolding only. All copy ("7 Days in Japan", "@somchai.travels", "฿2,400",
etc.) is placeholder lorem — replace with real/localized content (Thai + English, i18next).

Each flow is presented as lettered **approaches (A / B / C)** that are mutually exclusive design
directions. A product decision is required to pick one per flow before building; they are not meant
to coexist.

## How to View the Wireframes
Open `Trailr Wireframes.html` in a browser. It renders an infinite pan/zoom canvas:
- **Scroll / pinch** to pan and zoom.
- Each row is a flow; each card is an approach.
- Click a card's **⤢ expand** icon to view it fullscreen; **← / →** step through approaches.
- A **Tweaks** panel toggles the accent color, annotations, handwritten font, and paper grain
  (these are review aids, not product features).

`design-canvas.jsx` and `tweaks-panel.jsx` are the canvas/review harness — **ignore them for
implementation**. The actual designs live in `wf-feed.jsx`, `wf-journal.jsx`, `wf-builder.jsx`,
`wf-more.jsx`, with shared primitives in `wf-kit.jsx`.

---

## Global Frame & Shared Chrome
- **Device:** iPad landscape. Screen canvas **1194 × 834** (the device bezel in the mock adds 16px;
  ignore the bezel when building — it's just to signal "tablet").
- **Top app bar (`TopBar`)**, ~58px tall, bottom border: `trailr` wordmark · primary tabs
  `[Feed] [Explore] [Trips] [Saved]` (active tab highlighted) · flexible spacer · search field
  ("Search places, trips, people") · `+ New trip` button · avatar. Some approaches replace this with
  a **left icon rail** (`Rail`, 64px) — that's a deliberate navigation-structure variant.
- **Maps:** every map region is a placeholder labeled `[ Mapbox … ]`. In the real app these are live
  **Mapbox GL** maps. Pins, dashed route lines, and "trail" overlays shown in the mocks correspond to
  `trail_points` (GeoJSON overlay) and `posts.latitude/longitude` from the schema.

---

## Flows, Screens & Approaches

### 1. Home Feed — `wf-feed.jsx`
A location-embedded social feed. **Every post is place-tagged**, and tapping a post opens its Trip
Journal (flow 2).

- **A · Split — feed + live map** (`FeedA`): TopBar; left column (~540px, scroll) of Instagram-style
  post cards (avatar + username, location chip e.g. "Wat Arun · Bangkok", large photo, action row
  ♡ / comment / share / bookmark, caption). Filter chips at top: Following / Nearby / For you. Right
  pane = live map with numbered pins matching the visible posts, a hovering post mini-preview anchored
  to a pin, and a "12 friends posting now" badge. Posts pin to where they were taken.
- **B · Map-first / immersive** (`FeedB`): left icon rail; full-bleed map IS the feed. Floating search
  ("Explore Chiang Mai") + category chips (Food / Cafés / Stays / Viewpoints) over the map; numbered
  pins; a bottom horizontal carousel of place cards (photo, avatar, "2.3km away") anchored to pins.
- **C · Explore grid + context rail** (`FeedC`): TopBar (Explore active); center = Pinterest/IG-style
  masonry photo grid with category chips (Trending / Thailand / Japan / Food / Hidden gems); right rail
  (~360px) = selected post detail (author, large photo, mini "where" map, "Save to a trip" CTA, "More
  near here" thumbnails).

### 2. Trip Journal — `wf-journal.jsx`  ← (added per request: "tap a post → whole trip as journal/trail")
Reached by tapping any feed post. Renders the post's **entire trip** as a day-by-day journal/trail.
Shared contextual header: `trailr` · "‹ back to feed" · ♡ count · Share · **⑂ Use this trip** (fork) ·
avatar. Tabs within: Journal / Map / Album / Bookings. Maps to `trips`, `live_batches` (Day groupings),
`posts`, `media` (photo/video/audio), `trail_points`.

- **A · Journal feed + sticky trail map** (`JournalA`): left column (scroll) = trip cover ("7 Days in
  Japan"), author + stats ("Apr 2026 · 7 days · 84 photos · 6 audio notes", "⑂ 24 forks"), then
  **day blocks** ("Day 1 — Tokyo", date, "12 moments") each containing a vertical **timeline** of
  *moments*: time gutter (e.g. 8:40) + accent dot + rail; location chip; photo (or "photo + 0:18
  video"); caption; optional **audio-journal player chip** ("▶ audio journal · 0:42"). Right (~420px)
  = **sticky** map of the whole trail with day pins, current day highlighted, "Day 1 of 7" badge, and
  a vertical 7-dot day scrubber. Map stays pinned as the journal scrolls.
- **B · Map-led journey + day scrubber** (`JournalB`): top = large trail map (~320px) of the whole
  journey with numbered day pins + "▶ Replay journey" control. Below = horizontal **day scrubber**
  (D1·Tokyo … D7·Tokyo, selected highlighted). Below = the selected day's **moments** as a horizontal
  row of cards (time, ♡ count, photo, location chip, caption).
- **C · Scrapbook spread (diary)** (`JournalC`): a two-page travel-diary spread. Handwritten day title
  ("Day 3 · Kyoto"), date + diary line; **tilted polaroid photos** with washi-tape; handwritten
  captions; a **voice-note chip**; a small inset **route map** for the day; "↺ swipe for Day 4" affordance.
  This is the most expressive/Gen-Z direction.

### 3. Trip Builder — `wf-builder.jsx`
Canva-style blueprint editor. Maps to `trips` + itinerary items; auto-saving; Publish sets visibility.

- **A · Blocks + canvas + inspector** (`BuildA`): editor toolbar (wordmark, trip title, Auto-saved,
  Preview, **Publish trip**). Left (~210px) = draggable **block library** (Day, Place, Flight, Hotel,
  Note, Photo, Budget). Center = blueprint **canvas** (faint grid) with a "Day 3 — Kyoto" group of
  stop cards (photo, "9:00 · 1.5 hrs", caption) and a dashed **drop zone**. Right (~280px) =
  **inspector** for the selected block (cover photo, title, time fields, notes, "＋ Add to booking").
- **B · Day timeline + map** (`BuildB`): left (~460px) = day chips (D1–D5) + a **vertical day timeline**
  of stop cards. Right = map with the day's **route** (numbered pins, "3 stops · 4.2 km · 22 min walk")
  and a "Search a place to drop onto Day 3" field. Plan by geography; days + map stay in sync.
- **C · Day board (columns)** (`BuildC`): toolbar; a thin **mini-map strip** of the whole route; then a
  **Kanban board** where each column is a Day (Tokyo / Hakone / Kyoto / Osaka) holding stop cards with
  "＋ add stop" drop targets and a "＋" to add a day. Drag stops between days like cards.

### 4. GPS Auto-Album — `wf-more.jsx`
Photos auto-grouped from EXIF GPS + time into day/location clusters (see §6.3 of architecture).

- **A · Day-cluster grid + trail** (`AlbumA`): header ("Auto-album", "generated from 84 photos",
  Reorder / **Post album**). Left (~380px) = day **trail map** ("auto-matched to your route"). Right =
  clusters grouped by location/time ("Morning · Fushimi Inari · 8:12–10:40", "Lunch · Nishiki Market")
  each a 4-up photo grid, with a "0:18 video" item and a dashed "＋ add caption" cell.
- **B · Photo-pinned map story** (`AlbumB`): full map with **photo thumbnails pinned along the trail
  path**; right (~340px) story column (photo, "8:40 · Fushimi Inari" chips, captions). The album lives
  *on* the map as a walked photo-trail.

### 5. One-Click Booking — `wf-more.jsx`
Flights (Amadeus) + hotels (Agoda primary, Booking.com fallback). No in-app payment — handoff to
provider checkout. Prices in **THB (฿)**. Maps to `bookings`.

- **A · Inline in the trip** (`BookA`): contextual header ("‹ Japan trip · Add stays & flights ·
  Day 1–7"). Left (~560px) = a **flight summary card** ("BKK → KIX · 1 May · 1 stop · 7h 20m · ฿9,800
  · via Amadeus · Book") then "Stays near your route" (Agoda / Booking.com source chips) and **hotel
  rows** (photo, ★ rating, "0.4km to Day 3", ฿ price, **Book**). Right = map of stays vs your stops.
  Booking lives *inside* the trip; stays ranked by distance to stops.
- **B · Dedicated search panel** (`BookB`): left (~240px) **filters** (dates, guests, price slider,
  amenity chips). Center (~540px) results with **Hotels / Flights tabs** + sort, list of hotel rows.
  Right = results map with ฿ price pins.

### 6. Profile / Trip Cards — `wf-more.jsx`
Forkable trips + social graph (`users`, `follows`, `trips.fork_count`, `forked_from_id`).

- **A · IG profile + trip grid** (`ProfA`): IG-style header (avatar, "@somchai.travels", Edit profile /
  Share, stats "18 trips · 4,210 followers · 312 following", bio); tabs Trips / Albums / Saved / Map;
  4-up **trip card grid** (cover, title, "⑂ 24 forks · ♡ 1.2k", a **LIVE** badge for active trips, and
  fork attribution "↳ based on @mai's Japan trip").
- **B · Map-of-travels profile** (`ProfB`): left = a **map of every place visited** (pins, "14 countries ·
  38 cities"); right (~400px) = profile summary + Follow + a list of trip cards (with LIVE / fork
  attribution).

---

## Interactions & Behavior (intended)
- **Feed post → Trip Journal:** tapping any post opens that post's full trip journal (flow 2). This is
  the primary navigation added in this round.
- **Use this trip (⑂ fork):** deep-copies the trip (`forked_from_id` set, original `fork_count++`),
  per §6.4. Shown on journal header and trip cards.
- **Trip Builder:** drag blocks/places onto the canvas/days; auto-save; Publish sets `status` +
  `visibility`.
- **Live / trail:** "Replay journey", "Following along · Day n of 7", and live pins reflect realtime
  `trail_points` (Supabase Realtime) — see §6.1 / §12.
- **Audio journals & video:** moments may carry a 0:42 audio note or short (≤30s) video (`media.type`).
- **Booking:** "Book" stores intent in `bookings` then hands off to the provider; results cached 15 min.
- **i18n:** all strings must be externalized (Thai default + English).
- **Responsive:** these are tablet layouts; mobile (during-trip) and web (public trip URL, SEO) are
  separate targets noted in the architecture doc and not drawn here.

## State (intended, from architecture)
Per-screen state generally derives from: `users`, `trips`, `posts`, `media`, `trail_points`,
`live_batches`, `follows` / `likes` / `comments`, `bookings`, `notifications`. Use React Query for
server state + caching, Zustand for local UI state. See `TRAILR_ARCHITECTURE.md` §5–§6.

---

## Wireframe "Design Tokens" (scaffolding only — DO NOT ship as brand)
These values style the *wireframe*, not the product. Replace with Trailr's real design system.

| Token | Value | Role in mock |
|---|---|---|
| ink | `#2c2a26` | strokes / primary text |
| sub | `#9b958a` | secondary text |
| paper | `#fbf9f5` | surface background |
| panel | `#f3efe7` | secondary panels |
| line | `#cdc6b8` | hairlines |
| bar | `#ddd7c9` | text-line placeholders |
| accent | `#e07a5f` (default) | single warm accent — pins, CTAs, active states |
| accent (alt) | `#3d9a8b`, `#6b6fd6`, `#8a8073` | tweakable accent options |
| map / mapline / mapwater | `#e9ece3` / `#d4d9cb` / `#d9e5e1` | fake map surface |

- **Type (mock):** `Patrick Hand` (UI), `Caveat` (display/handwriting), `Courier New` (mono placeholder
  labels). Real app should use Trailr's chosen type system (Thai + Latin support required).
- **Device frame:** iPad landscape, 1194 × 834 working area.
- The hand-drawn border look is a CSS trick (`border-radius: 255px 15px 225px 15px / 15px 225px 15px
  255px`) — purely a wireframe aesthetic; build with normal radii.

## Assets
No real assets are used. Every image/photo/video/map is a **striped placeholder** with a monospace
label (e.g. `[ trip photo ]`, `[ Mapbox map ]`). Source real media from Supabase Storage / Cloudflare
CDN and real maps from Mapbox per the architecture doc.

## Files in this bundle
- `Trailr Wireframes.html` — entry point; lays every flow/approach onto the review canvas.
- `wf-kit.jsx` — shared sketch primitives (IPad, TopBar, Rail, MapBg, Pin, Avatar, Chip, Btn, Bars, Ph,
  Note, Wordmark) + frame constants.
- `wf-feed.jsx` — Home Feed A/B/C.
- `wf-journal.jsx` — Trip Journal A/B/C.
- `wf-builder.jsx` — Trip Builder A/B/C.
- `wf-more.jsx` — Auto-Album, Booking, Profile.
- `design-canvas.jsx`, `tweaks-panel.jsx` — review harness only (not part of the product).
- `TRAILR_ARCHITECTURE.md` — full product + technical spec and database schema (source of truth).
