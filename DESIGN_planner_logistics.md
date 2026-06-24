# Design — Planner Logistics: distinct Flights & Stays + live booking

> **SUPERSEDED by [`DESIGN_bookings.md`](DESIGN_bookings.md).**
> Amadeus decommissioned; pivot to Duffel + LiteAPI + email ingestion (TripIt model).
> The §4 distinct Flights/Stays blocks UI plan still applies and is carried forward.
> Do not implement from this doc — use `DESIGN_bookings.md` instead.

---

## 1. Goal

In the **Planner** stage of the trip builder, flights and stays are currently just
two of eight stop *categories* (`place, food, landmark, activity, hotel, flight,
transport, note`). They sit inline in the day-by-day timeline, share the same
`StopCard`, the same add/edit modal, and the same fields. Nothing distinguishes a
flight from a museum visit except a category chip.

Make flights and stays **distinct logistics blocks**, separate from the sightseeing
timeline, and let the user **search live offers** (Amadeus flights, mock hotels) and
one-tap add them — the dormant bookings backend wired into the Planner.

**Out of scope:** touching the Live/Album stages; changing the Journal's existing
`/booking/[id]` screen; a real hotel provider (Booking.com/Agoda — see §3); city→IATA
resolution beyond a small built-in hint map.

---

## 2. Current state (what already exists)

- **Planner** (`trailr/app/builder/[id].tsx`): flight/hotel are inline timeline stops.
- **Bookings backend is real and complete:**
  - `BookingsService` (search / create / confirm / cancel, 8% commission).
  - Provider abstraction: `AmadeusBookingProvider` (real, hits `test.api.amadeus.com`,
    **flights only** — `searchHotels` returns `[]`) and `MockBookingProvider` (offline).
  - `BookingProviderModule` auto-selects Amadeus **iff** `AMADEUS_CLIENT_ID`/`SECRET`
    are set, else mock — no code change to switch.
  - Booking an offer writes a linked `flight`/`hotel` logistics stop into the itinerary.
- **Booking UI** (`/booking/[id]`, "BookA"): full flight+hotel screen, but **only
  reachable from the Journal** (Living stage), with **hardcoded** `BKK→KIX` / `Kyoto`
  queries — not trip-parameterized. The Planner can't reach it.
- **Hooks ready to reuse:** `useOfferSearch`, `useCreateBooking` (`packages/db`).

**Latent bug found:** `useCreateBooking` invalidated `['stops', tripId]`, but trip
stops are keyed `['stops','trip',tripId,status]` (`stopKeys.tripStops`). So a booked
flight/hotel would never refresh the Planner. (Fixed in Phase 2 — see §8.)

---

## 3. The API question — answered

**Amadeus — yes, get it. It's a true free self-serve sandbox and it's already wired.**
- Sign up at the Amadeus for Developers self-service portal → instant
  `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`. Paste into `api/.env`; the provider
  module flips mock → real with zero code change.
- Caveats: the **test** dataset is a limited cached set (not every route/date); prices
  return in EUR/USD so we convert via `AMADEUS_THB_RATE` (default 38). Fine for a demo.
- **Hotels are not wired to Amadeus** (`searchHotels` → `[]`). Even with keys, stays stay
  on the mock provider unless we do extra work (Amadeus Hotel test API is separate +
  sparse).

**Booking.com Demand API / Agoda — don't bother for now.** These are partner/affiliate
programs behind approval (business vetting, often weeks, usually a registered company +
traffic). No self-serve dev key like Amadeus. For a portfolio/demo, keep hotels on the
mock provider — it returns realistic offers *with coordinates*, so the map works.

**Net:** ~5 min to get Amadeus keys → real flights. Leave hotels mocked. Skip
Booking/Agoda.

---

## 4. Design — distinct logistics blocks (Phase 1)

A **Logistics region** pinned at the top of the timeline, above Day 1, with two blocks:

| Block | Source | Card shows |
|---|---|---|
| ✈ Flights | stops where `category === 'flight'` | route/airline · time · cost |
| 🛏 Stays | stops where `category === 'hotel'` | name · nights/notes · cost |

- Flight/hotel stops are **excluded** from the day timeline + unassigned lists
  (`isLogistics(s)` filter) so they render *only* in their dedicated block.
- Each block: header (icon + title + count pill) + an **Add** button + tailored cards
  with edit/remove. Empty state invites search-or-manual.
- **Map:** logistics are removed from the numbered **sightseeing route** line. Stays
  with a pinned location still appear as **unnumbered** map pins (a hotel location is
  useful; it's just not a route waypoint). Flights have no coords → never were pins.

Pure frontend — no schema change, the `flight`/`hotel` categories already exist.

---

## 5. Design — live booking in the Planner (Phase 2)

A compact **`BookingSearchModal`** (own component) scoped to one type, opened by the
block's Add button:

- **Prefilled-but-editable** search params from the trip:
  - Flight: `origin` (default `BKK`), `destination` (IATA — prefilled from a small
    `CITY_IATA` hint map, editable), `depart_date` (first dated day).
  - Hotel: `city` (= `trip.destination`), `check_in` (first dated day), `nights`
    (day count).
- **Search** → `useOfferSearch(params)` → offer list. **Add** → `useCreateBooking`
  (writes the logistics stop server-side) → Planner refetches stops, toast.
- Assignee picker (`WhoForControl`) when ≥2 collaborators, so a booking can be split.
- **Manual fallback:** "＋ Add manually instead" opens the existing stop form preset to
  that category — not every flight/hotel is bookable.

**The IATA problem (honest):** `trip.destination` is free text ("Osaka"); Amadeus needs
IATA codes (`KIX`). A perfect city→IATA resolver is out of scope — the modal prefills a
best-effort code from a built-in hint map (common APAC cities) and lets the user correct
it. Hotels use the city name directly, so they're unaffected.

---

## 6. Phase 3 — Amadeus keys (pending, needs you)

1. You: create Amadeus self-service app → copy Client ID + Secret.
2. Paste into `api/.env`:
   ```
   AMADEUS_CLIENT_ID="…"
   AMADEUS_CLIENT_SECRET="…"
   AMADEUS_THB_RATE="38"
   ```
3. Restart the API → flight search returns real test fares; hotels stay mock.
   No code change (the provider module already branches on these env vars).

`api/.env.example` already documents these keys (lines 27–31).

---

## 7. File-by-file

**Frontend (Planner)**
- `trailr/app/builder/[id].tsx` — `isLogistics` helper; `flightStops`/`stayStops` memos;
  exclude logistics from `days`/`unassigned`; Logistics region with two `LogisticsBlock`s;
  unnumbered stay map pins; `openBooking(type)`; render `BookingSearchModal`; styles.
- `trailr/src/components/BookingSearchModal.tsx` — NEW. Type-scoped live offer search +
  book + manual fallback + `CITY_IATA` hint map.

**db-client**
- `packages/db/src/hooks/useBookings.ts` — fix `useCreateBooking` stop invalidation key
  to `['stops','trip',tripId]`.

**Config / docs**
- `api/.env.example` — already has Amadeus block (no change needed, or tighten wording).

**No backend, schema, or migration changes.**

---

## 8. Build order (when you say go)

| Phase | Scope | Risk |
|---|---|---|
| 1 — distinct Flights/Stays blocks | `builder/[id].tsx` only; frontend; no schema | low |
| 2 — live booking modal | new `BookingSearchModal.tsx`; reuse `useOfferSearch`/`useCreateBooking`; **fix the stop-invalidation key bug in `useBookings.ts`** (§2) | medium |
| 3 — Amadeus keys | you paste keys into `api/.env`; no code | trivial (yours) |
| Verify | exercise in browser preview; prove flight search + add-to-trip | — |

Phase 1 is independently shippable (pure visual restructure). Phase 2 layers the live
search on top. Phase 3 is just configuration. Build 1 → verify → 2 → verify → 3.

> Note: this was prototyped once and reverted, so the edits are known-good and
> tsc-clean — re-implementing is low-risk when you're ready.

---

## 9. Open questions

1. **Manual entry vs. booking-only:** the Add buttons currently open the live search
   (with a manual fallback link). Prefer manual-first with a "search live" link instead?
2. **Stay pins on the map:** keep unnumbered hotel pins, or hide logistics from the
   Planner map entirely and keep the map purely sightseeing?
3. **Journal `/booking/[id]` screen:** leave hardcoded, or also trip-parameterize it for
   consistency? (Out of current scope; flagged.)
4. **`transport` category:** it's neither flight nor stay — leave it in the day timeline
   (current plan), or fold it into a logistics block too?
