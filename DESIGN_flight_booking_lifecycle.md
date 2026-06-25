# Design — Flight Booking Lifecycle (search → book → attach → display)

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Date:** 2026-06-25
> **Pairs with:** `DESIGN_flight_date_lock.md` (the date guard + lock; this doc supplies the
> data it validates), `DESIGN_bookings.md` / `DESIGN_bookings_refactor.md` (booking model),
> `DESIGN_booking_detail.md` (the detail screen this enriches), `NEXT.md` item 3 (Duffel, now live).
> **Decisions captured here:** (1) itinerary truth is **copied onto the Stop**; (2) **compact**
> flight rows everywhere, **rich** itinerary only on the detail screen.

---

## 1. What & why — the two-record model

`bookings.service.create()` ([api/src/modules/bookings/bookings.service.ts:68](trailr/api/src/modules/bookings/bookings.service.ts)) writes **two records** for one booked flight:

- a **`Stop`** (`category:'flight'`, today just `location_name` + `cost`) → rendered by the builder timeline (`LogisticsBlock`, [src/builder/components.tsx:159](trailr/src/builder/components.tsx))
- a **`Booking`** row, linked by `stop_id` → rendered by Saved→Booked + the detail screen

The rich itinerary (segment times, airports, carrier) now lives **only on `booking.meta`** (added with Duffel). The Stop gets none of it — which is the root of all three gaps below.

### The three gaps this fixes
1. **Search offer card** ([BookingSearchModal.tsx:295-309](trailr/src/components/BookingSearchModal.tsx)) renders only `offer.title` + the raw `offer.subtitle` string → live Duffel shows `Duffel Airways · non-stop · PT6H7M` (unformatted ISO duration, mojibake `·`). Structured `meta` is discarded at display.
2. **Detail screen** ([view/[id].tsx:100-107](trailr/app/booking/view/[id].tsx)) reads **stale keys** `meta.route` / `meta.airline` / `meta.depart_date`. Duffel emits `meta.origin/destination/departing_at/segments` → a Duffel flight's detail screen shows nothing under the flight branch. **Active bug.**
3. **Builder card + date guard** can't show or validate times because the Stop never received `departing_at`.

### Success criteria
- One canonical itinerary shape, emitted by every producer and read by every consumer.
- A booked/imported Duffel flight shows real times + route in the offer card, the builder card, and the detail screen.
- The builder card and the date guard read the **Stop alone** — no booking join.
- No regression for hotels or for mock/keyless dev.

---

## 2. The spine — canonical flight itinerary shape

Define once (in `@trailr/shared`) and reuse everywhere:

```ts
// compact summary — lives on BOTH stop.meta and booking.meta
interface FlightSummary {
  origin: string;        // IATA, e.g. "BKK"
  destination: string;   // IATA, e.g. "KIX"
  dep_at: string | null; // ISO local, e.g. "2026-07-10T06:58:00" — drives lock + guard
  arr_at: string | null;
  carrier: string | null;       // "ZZ"
  carrier_name: string | null;  // "Duffel Airways"
  flight_number: string | null; // "5528"
  stops: number;                // segments.length - 1
}

// full per-segment itinerary — lives ONLY on booking.meta (detail screen)
interface FlightSegment {
  origin: string | null; destination: string | null;
  departing_at: string | null; arriving_at: string | null;
  carrier: string | null; carrier_name: string | null; flight_number: string | null;
}
```

`booking.meta` already carries `segments: FlightSegment[]` + the summary fields (Duffel done). This doc adds the **same summary** to the Stop (§4) and normalizes the other producers (§3).

---

## 3. Producers — normalize all three to the shape

| Producer | File | Today | Change |
|---|---|---|---|
| **Duffel** | `duffel.provider.ts` | ✅ emits `origin/destination/departing_at/arriving_at/segments` | none (done) |
| **Mock** | `mock.provider.ts` | emits `meta: { airline, depart_date }` | emit the `FlightSummary` shape (synthesize `dep_at` from `depart_date` + a fixed time, one segment) so dev/keyless looks identical |
| **Email ingestion** | `ingestion.service.ts` (`parsed.dep_time`, regex `BKK -> NRT`) | loose `dep_time` + airports | map the regex airports → `origin/destination`, `dep_time` → `dep_at`; populate the same summary |

After this, **no consumer reads provider-specific keys** — they all read `FlightSummary`.

---

## 4. Attach — copy the summary onto the Stop (the chosen model)

**Schema (one migration):** add `meta Json?` to `model Stop` (mirrors `Booking.meta`; Stop currently has no free-form field). Thread it through the `StopWithMedia` type + stop selects.

**At `bookings.service.create()`**, when `type==='flight'`, write onto the Stop:
- `meta` = the `FlightSummary`
- `planned_start` = `dep_at`'s `HH:MM`, `planned_end` = `arr_at`'s `HH:MM` → the **existing** builder time chip renders with zero card changes
- `location_name` = `"BKK → KIX"` (already the offer title)

Same denormalization happens in `ingestion.service.match()` so imported flights are identical.

**Consequences (clean wins):**
- Builder card shows times immediately (chip already reads `planned_start/end`).
- The **date guard** (`DESIGN_flight_date_lock.md` §2) reads `stop.meta.dep_at` — validates at the stop level, no booking join.
- The §3 timeline "lock" is a property of the stop, not a lookup.

Full `segments[]` stays on the Booking only — the detail screen is the one place that joins to it.

---

## 5. Display — compact everywhere, rich on detail

**Compact flight row** (shared render, used by the offer card **and** the builder logistics card):
```
BKK 06:58 → KIX 15:05 · 6h 7m · non-stop        (· N stop[s] when stops>0)
```
- Add a `formatDuration(iso)` helper (`PT6H7M` → `6h 7m`) and a `flightRowLine(FlightSummary)` helper in `src/lib/bookingDisplay.ts` (already exists). Fixes the raw-ISO + drops the string-built subtitle.
- Offer card ([BookingSearchModal.tsx:296](trailr/src/components/BookingSearchModal.tsx)): render the line from `offer.meta` instead of `offer.subtitle`.
- Builder card: the time chip already covers it once §4 sets `planned_start/end`; optionally show the route line from `stop.meta`.

**Rich detail screen** ([view/[id].tsx](trailr/app/booking/view/[id].tsx)): replace the stale flight branch in `buildRows` with a **per-segment itinerary block** reading `meta.segments` — each leg as `BKK 06:58 → KIX 15:05 · ZZ 5528`, plus layover gaps when `segments.length > 1`. Keep Provider / Confirmation / Booked-on rows.

**Mojibake note:** the `·` serializes as `Â·` — a UTF-8/latin-1 quirk in the existing subtitle path. Building rows from structured data (not a pre-joined string) sidesteps it; use a literal `·` in the RN `<Text>`.

---

## 6. Date guard — unchanged plan, now fed real data

Per `DESIGN_flight_date_lock.md` §2: **soft** guard in `match()` + booking-create, reading `stop.meta.dep_at` (or the offer's `dep_at` pre-attach), ±1 day, allow when trip dates or `dep_at` are absent. Promote to **hard** reject now that `dep_at` is structured and trustworthy for Duffel.

---

## 7. Build order
1. `FlightSummary`/`FlightSegment` types in `@trailr/shared`; `formatDuration` + `flightRowLine` in `bookingDisplay.ts`. *(verify: unit)*
2. Mock + ingestion producers emit the shape. *(verify: mock search + email-import parity)*
3. `Stop.meta` migration + thread through type/selects; populate at booking-create + ingestion-match. *(verify: tsc, book a flight → stop.meta set)*
4. Offer card + builder card render the compact line. *(verify: browser — live Duffel offer shows BKK 06:58 → KIX 15:05 · 6h 7m)*
5. Detail screen per-segment block. *(verify: browser — booked Duffel flight detail)*
6. Date guard reads `dep_at` (soft → hard). *(verify: import an out-of-window flight)*

> Steps 1-2 are pure/no-migration and unblock everything; step 3 is the only schema change.
