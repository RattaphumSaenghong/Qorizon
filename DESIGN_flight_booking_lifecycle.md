# Design — Flight Booking Lifecycle (search → book → attach → display)

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Date:** 2026-06-25
> **Pairs with:** `DESIGN_flight_date_lock.md` (the date guard + lock; this doc supplies the
> data it validates), `DESIGN_bookings.md` / `DESIGN_bookings_refactor.md` (booking model),
> `DESIGN_booking_detail.md` (the detail screen this enriches), `NEXT.md` item 3 (Duffel, now live).
> **Decisions captured here:** (1) itinerary truth is **snapshotted onto the Stop** (`stop.meta`
> JSON carrying the `FlightSummary`); (2) **compact** flight rows everywhere, **rich** itinerary
> only on the detail screen.
> **Revised** after review + reconciled to shipped code (`354ba17`): tz-honest compact line (§5),
> guard reads the incoming dep_at not the Stop (§4/§6, matches shipped), snapshot-vs-source-of-truth
> rule (§4), mojibake downgraded to verify-first (§5). Storage is `stop.meta Json?` as shipped —
> review #3's typed-column push was reversed (the guard never queries the stop, so it added nothing).

---

## 1. What & why — the two-record model

`bookings.service.create()` ([api/src/modules/bookings/bookings.service.ts:68](trailr/api/src/modules/bookings/bookings.service.ts)) writes **two records** for one booked flight:

- a **`Stop`** (`category:'flight'`, today just `location_name` + `cost`) → rendered by the builder timeline (`LogisticsBlock`, [src/builder/components.tsx:159](trailr/src/builder/components.tsx))
- a **`Booking`** row, linked by `stop_id` → rendered by Saved→Booked + the detail screen

The rich itinerary (segment times, airports, carrier) now lives **only on `booking.meta`** (added with Duffel). The Stop gets none of it — which is the root of all three gaps below.

### The three gaps this fixes
1. **Search offer card** ([BookingSearchModal.tsx:295-309](trailr/src/components/BookingSearchModal.tsx)) renders only `offer.title` + the raw `offer.subtitle` string → live Duffel shows `Duffel Airways · non-stop · PT6H7M` (unformatted ISO duration, mojibake `·`). Structured `meta` is discarded at display.
2. **Detail screen** ([view/[id].tsx:100-107](trailr/app/booking/view/[id].tsx)) reads **stale keys** `meta.route` / `meta.airline` / `meta.depart_date`. Duffel emits `meta.origin/destination/departing_at/segments` → a Duffel flight's detail screen shows nothing under the flight branch. **Active bug.**
3. **Builder card** can't show times because the Stop never received `dep_at`; and there's no **date guard** wiring at all yet (the data to validate against now exists — see §6).

### Success criteria
- One canonical itinerary shape, emitted by every producer and read by every consumer.
- A booked/imported Duffel flight shows real times + route in the offer card, the builder card, and the detail screen.
- The builder card renders from the **Stop alone** (no booking join); the guard validates the **incoming** `dep_at` before the Stop exists (§6).
- No regression for hotels or for mock/keyless dev.

---

## 2. The spine — canonical flight itinerary shape

Define once (in `@trailr/shared`) and reuse everywhere:

```ts
// compact summary — lives on BOTH stop.meta and booking.meta
interface FlightSummary {
  origin: string;        // IATA, e.g. "BKK"
  destination: string;   // IATA, e.g. "KIX"
  dep_at: string | null; // ISO local, e.g. "2026-07-10T06:58:00". Stored inside stop.meta (§4);
  arr_at: string | null;  // the guard reads the *incoming* dep_at, never the stop's (§6).
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

## 4. Attach — snapshot the summary onto the Stop (as shipped in `354ba17`)

**Schema (shipped):** one migration `stop_meta` adds **`meta Json?`** to `model Stop`. `stop.meta` carries the full `FlightSummary` (`origin, destination, dep_at, arr_at, carrier, carrier_name, flight_number, stops`). Thread `meta` through `StopWithMedia` + the stop selects (feed / journal / saved / builder — several call sites). Hotels and regular stops leave `meta` null and are unaffected.

> **Why a JSON blob is fine here (reversing review #3).** The original review pushed for typed `dep_at`/`arr_at` columns "so the guard can query them." But §6 / #2 established the guard reads the **incoming** `dep_at`, never `stop`'s — so the stop value is never queried in SQL. The remaining cases (ad-hoc "flights in window" reports, sorting) are speculative and JS-sortable from the JSON. So `meta Json?` carries its weight; no typed columns needed. The slippery-slope worry stands but is mild (Booking already has `meta`).

**At `bookings.service.create()`** (and `ingestion.service.match()`), `type==='flight'` writes:
- `meta` = the `FlightSummary` (`extractFlightSummary(dto.meta)`)
- `planned_start` / `planned_end` = `timeFromIso(dep_at)` / `timeFromIso(arr_at)` — local `HH:MM` for the existing chip
- `location_name` = the offer title (`"BKK → KIX"`)

> **#1 still applies to *display*, even though the chip is populated.** `planned_start/end` are naive `HH:MM` from two timezones. The chip is an acceptable rough display, but the **compact flight line (§5) must render from `meta` with duration-lead + `+N`-day marker** — don't treat the `planned_start–planned_end` range as tz-truth.

**Snapshot semantics (source-of-truth rule).** `stop.meta` is an **immutable snapshot** at attach time, used by the timeline + guard-at-attach. The **`Booking` is the source of truth** for the detail screen (full `segments[]`, status, cancellation). They can legitimately diverge if a booking is later amended/cancelled — timeline reflects the snapshot, detail screen reflects the live booking. No sync attempted.

**What the guard actually reads (shipped, matches #2).** `flightDepartsOutsideTripWindow(trip, summary.dep_at)` validates the **incoming** offer `meta.dep_at` *before* the Stop exists — not `stop.meta`. ⚠️ **As shipped it is a HARD `BadRequestException`**, which is right for Duffel's structured data but contradicts `DESIGN_flight_date_lock.md` §2's "soft for email ingestion." Reconcile: keep hard on the Duffel/offer path, soft+override on the regex-parsed ingestion path. (See §6.)

---

## 5. Display — compact everywhere, rich on detail

**Lead with duration — the times are two different timezones.** `dep_at` is local *departure*-airport time; `arr_at` is local *arrival*-airport time. BKK 06:58 → KIX 15:05 looks like 8h but is 6h7m (JST is +2h). So the **duration is the only honest cross-tz number** — lead with it, and render the clock times as same-tz-local labels with a **`+N` day marker** when `arr_at`'s date is after `dep_at`'s:
```
BKK → KIX · 6h 7m · non-stop · dep 06:58           (non-stop)
BKK → KIX · 11h 20m · 1 stop · dep 23:10 → arr 09:30 +1   (overnight, next-day arrival)
```
- Helpers in `src/lib/bookingDisplay.ts` (exists): `formatDuration(iso)` (`PT6H7M`→`6h 7m`, must also handle `PT12H` and multi-day `P1DT2H`); `dayOffset(dep_at, arr_at)` → `+1`/`""`; `flightRowLine(FlightSummary)`.
- **Do not** present `dep`–`arr` as a single `HH:MM – HH:MM` range without the `+N` marker — that's the §4/#1 tz trap. Duffel airport objects carry `time_zone` if we later want true tz labels; out of scope for the compact line.
- Offer card ([BookingSearchModal.tsx:296](trailr/src/components/BookingSearchModal.tsx)): render `flightRowLine(offer.meta)` instead of the string-built `offer.subtitle`.
- Builder card: render `flightRowLine(stop.meta)`; do **not** rely on the generic `planned_start/end` time chip for flights (it has no tz/`+N` awareness).

**Rich detail screen** ([view/[id].tsx](trailr/app/booking/view/[id].tsx)): replace the stale flight branch in `buildRows` with a **per-segment itinerary block** reading `meta.segments` — each leg as `BKK 06:58 → KIX 15:05 · ZZ 5528`, plus layover gaps when `segments.length > 1`. Keep Provider / Confirmation / Booked-on rows.

**Mojibake — verify before "fixing".** The `·` shows as `Â·` in the curl/`json.tool` terminal dump; that may be **terminal-only**, not a real UI bug. **First check whether it actually renders wrong in the browser** (2 min). If it does, the cause is source-file encoding (the `·` byte sequence decoded as latin-1), so a literal `·` in `<Text>` would reproduce it — fix the encoding at the source, don't paper over it by rebuilding the string.

---

## 6. Date guard — reads the *incoming* dep_at, not the Stop

Per `DESIGN_flight_date_lock.md` §2: **soft** guard, ±1 day, allow when trip dates or `dep_at` are absent; promote to **hard** once `dep_at` is structured (Duffel). The guard runs **before the Stop exists**, so it reads the **incoming source's** `dep_at`:
- `ingestion.service.match()` → `parsed.dep_at` on the inventory item
- `bookings.service.create()` → `dto`/offer `meta.dep_at`

`stop.meta.dep_at` (§4) is the post-attach snapshot for the lock + display — **not** the guard input. The shipped `flightDepartsOutsideTripWindow()` already does this correctly. Remaining: make the **ingestion path soft+override** (currently the booking path's hard `BadRequestException` is reused everywhere).

---

## 7. Build order

**Shipped in `354ba17`:**
- ✅ `FlightSummary`/`FlightSegment` types in `@trailr/shared`; `flight-itinerary.ts` helpers (`extractFlightSummary`, `flightSegmentsFromMeta`, `timeFromIso`, `flightDepartsOutsideTripWindow`).
- ✅ Mock + ingestion producers emit the shape; Duffel already did.
- ✅ `stop.meta` migration + threaded through type/selects; populated at booking-create + ingestion-match (sets `meta` + `planned_start/end`).
- ✅ Guard at booking-create reads the incoming `dep_at` (hard reject).

**Remaining:**
1. Frontend `formatDuration` + `dayOffset` + `flightRowLine` in `bookingDisplay.ts`. *(verify: unit)*
2. Offer card + builder card render `flightRowLine` (duration-led, `+N` day marker), replacing the raw `offer.subtitle`. *(verify: browser — live Duffel offer shows BKK → KIX · 6h 7m · non-stop)*
3. Detail screen: replace the stale `meta.route/airline/depart_date` branch with the per-segment block from `meta.segments`. *(verify: browser — booked Duffel flight detail)*
4. Split the guard: soft + override on the **ingestion** path (keep hard on the offer path). *(verify: import an out-of-window flight)*
5. Mojibake: verify in-browser, fix at source if real (§5).

> The backend lifecycle is done; the remaining work is **all frontend display** plus the ingestion soft-guard.
