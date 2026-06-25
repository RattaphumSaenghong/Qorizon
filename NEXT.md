# Trailr — What To Do Next

> Start-of-session brief. Read `PROGRESS.md` first for current state, then pick ONE item below.
> Booking is **live** (LiteAPI sandbox key in `api/.env`); hotel recs, pricing floor, FX, the
> Book tab, and Saved→Booked all shipped & committed (`6c7e091`, `e8a4fd1`, `ec16038`, `03a2509`).

---

## Recommended order
**1 (verify) → 2 or 3 (quick wins) → 4 (the real one) → 5 (polish).**
Do **1 first** — the map UI has never run in a browser, so verify before building more on it.

---

## 1. Verify the Book / Explore map UI in the running app  ·  ~½ day  ·  DO FIRST
**Why:** `book/stays.tsx` (map browser) + `HotelDetailSheet` typecheck and the data endpoints
are smoke-tested, but the **UI itself was never run** — `MapView.onBoundsChange` firing is the
top open risk (`DESIGN_explore_stays.md` §9).

**Brief:** start API (`node --enable-source-maps dist/src/main.js` from `api/`) + Expo web
(`.claude/launch.json` → `trailr-web`, port 8081). Log in (somchai@trailr.app / password123;
web persists session in `localStorage` keys `trailr.access_token`/`trailr.refresh_token`).
Drive: `/(tabs)/book` → **Stays** → search a city → **"Search this area"** → pins appear →
zoom in (≤40 in view) → prices load → tap a pin → `HotelDetailSheet` → **Book** / **Add to trip**.
Watch console for errors; confirm bounds→center+radius works. Fix what breaks.

---

## 2. Per-booking detail screen  ·  ~½ day
**Why:** Saved→Booked cards are **display-only** — there's no screen to view a single booking
(`booking/[id]` is a *trip-scoped booking flow*, not a detail view).

**Brief:** new route `app/booking/view/[id].tsx` reading one `BookingRow` (add `GET /bookings/:id`
in `bookings.controller`/`service` if missing; `useBooking(id)` hook). Then re-enable the
`BookingCard` tap in `app/(tabs)/saved.tsx` to push there.

---

## 3. Real Duffel flights  ·  ~¼ day (+ key)
**Why:** flights currently fall back to **mock** (`DUFFEL_API_KEY` unset). Hotels are already live.

**Brief:** add `DUFFEL_API_KEY` (test key, `duffel_test_…`) to `api/.env`; restart; smoke-test a
live BKK→KIX search via `POST /bookings/search`; verify FX + `amount_thb` mapping in
`duffel.provider.ts` against a real response shape (mirror how LiteAPI was verified).

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

## Smaller cleanups (grab-bag, do alongside)
- Remove the dead `LITEAPI_KEY` line from `trailr/.env.local` (gitignored; frontend never reads it).
- DRY: `book/flights.tsx` re-implements `DateField` (also in `BookingSearchModal.tsx`).
- Book landing uses text "Flight"/"Stay" as icons — swap for real icons.

## Reference docs
`PROGRESS.md` · `DESIGN_explore_stays.md` · `DESIGN_book_tab.md` · `DESIGN_hotel_recs.md` ·
`trailr-pricing-ssp-anchor.md` (Downloads) · memory: `trailr-bookings`, `trailr-hotel-recs`, `trailr-fx-rates`.
