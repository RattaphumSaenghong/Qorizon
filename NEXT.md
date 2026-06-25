# Trailr — What To Do Next

> Start-of-session brief. Read `PROGRESS.md` first for current state, then pick ONE item below.
> Booking is **live** — both **LiteAPI** (hotels) and **Duffel** (flights) sandbox keys are in
> `api/.env`, smoke-tested end-to-end. Hotel recs, pricing floor, FX, Book tab, Saved→Booked,
> per-booking detail, and the flight-booking lifecycle backend all shipped.

---

## Recommended order
**6 (flight display, quick) → 4 (payments/MoR, the real one) → 5 (map polish).**
Items 1–3 are done (see below). **6** finishes the flight-booking lifecycle (frontend only —
backend shipped); **4** is the big one.

---

## ~~1. Verify the Book / Explore map UI~~ ✅ DONE (`8d36d78`)
Map renders, place search works, catalog pins appear, rates load and show THB prices on pins.
Fixed a bug: rates never loaded in dense areas because `hotels.length <= PRICE_THRESHOLD`
always failed with `limit:80`. Now always fetches rates for `hotels.slice(0, PRICE_THRESHOLD)`.
`HotelDetailSheet` opens with full price + /night, Book button active. Verified in browser.

---

## ~~2. Per-booking detail screen~~ ✅ DONE
Spec `DESIGN_booking_detail.md` implemented: `app/booking/view/[id].tsx`, `useBooking(id)`,
`GET /bookings/:id`, Saved→Booked card tap re-enabled. **Note:** its flight branch reads stale
`meta.route/airline/depart_date` — fixed by item **6** (the Duffel meta shape changed under it).

---

## ~~3. Real Duffel flights~~ ✅ DONE (`66069aa`, `354ba17`)
`DUFFEL_API_KEY` in `api/.env`, restarted, smoke-tested live BKK→KIX (`provider:"duffel"`, real
`off_…` ids, FX ~33.4 → `amount_thb`). Provider parses segment times/airports/carrier into the
`FlightSummary` shape; backend lifecycle (stop.meta, guard, normalized producers) shipped.
Remaining display work is item **6**.

---

## 4. Payments — LiteAPI Merchant-of-Record (User Payment SDK)  ·  multi-day  ·  THE BIG ONE
**Why:** `bookHotel` does prebook→confirm but **collects no money**. To actually sell, wire
LiteAPI's **User Payment SDK** (MoR model: LiteAPI takes the guest's card, pays you weekly —
see `trailr-pricing-ssp-anchor.md` §1 and the chat's payment research).

**Brief:** integrate the LiteAPI payment SDK at checkout (frontend card collection) + backend
prebook with the payment method; handle the weekly-payout/commission model; confirm payout +
KYC in the LiteAPI dashboard. **Sensitive — sandbox only first.** Scope it with `/to-prd` before coding.

---

## 5. Map polish (deferred from `DESIGN_explore_stays.md` §10)  ·  ~1 day
Marker **clustering** when zoomed out; tune `PRICE_THRESHOLD`/radius; in-memory **rate cache**
keyed on rounded (lat,lng,radius) to cut LiteAPI calls (mirror `MapboxService`'s cache).

---

## 6. Flight display (frontend) — finish the lifecycle  ·  ~½ day  ·  📋 SPEC'D → `DESIGN_flight_booking_lifecycle.md`
**Why:** the backend lifecycle shipped (`354ba17`) — `stop.meta` `FlightSummary`, normalized
producers, date guard — but the **frontend still shows the raw `offer.subtitle`** (e.g.
`Duffel Airways · non-stop · PT6H7M`) and the booking detail screen reads **stale** meta keys.

**Brief** (build order in `DESIGN_flight_booking_lifecycle.md` §7 "Remaining"):
1. `formatDuration` + `dayOffset` + `flightRowLine` helpers in `src/lib/bookingDisplay.ts`.
2. Offer card + builder logistics card render `flightRowLine` (duration-led, `+N`-day marker).
3. Detail screen: per-segment block from `meta.segments` (fixes the stale `meta.route` branch).
4. Split the date guard: **soft+override on the ingestion path**, keep hard on the offer path.
5. Verify the `·` mojibake is real in-browser before "fixing" it.

---

## Smaller cleanups (grab-bag, do alongside)
- Remove the dead `LITEAPI_KEY` line from `trailr/.env.local` (gitignored; frontend never reads it).
- DRY: `book/flights.tsx` re-implements `DateField` (also in `BookingSearchModal.tsx`).
- Book landing uses text "Flight"/"Stay" as icons — swap for real icons.

## Reference docs
`PROGRESS.md` · `DESIGN_flight_booking_lifecycle.md` (item 6) · `DESIGN_flight_date_lock.md` ·
`DESIGN_booking_detail.md` · `DESIGN_explore_stays.md` · `DESIGN_book_tab.md` · `DESIGN_hotel_recs.md` ·
`trailr-pricing-ssp-anchor.md` (Downloads) · memory: `trailr-bookings`, `trailr-hotel-recs`, `trailr-fx-rates`.
