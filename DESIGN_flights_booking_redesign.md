# Design — Flights Booking Redesign (Skyscanner-style)

> **Status:** PLAN — not implemented. Spec for the implementer (Codex).
> **Reference:** Skyscanner flight search/results UX.
> **Pairs with:** `DESIGN_bookings.md` (Duffel book flow), `DESIGN_book_tab.md`
> (the Book tab this screen lives under), `DESIGN_flight_booking_lifecycle.md`.
> **Target file:** `trailr/app/book/flights.tsx` (rewrite of the screen body).

---

## 1. What & why

The current `/book/flights` screen crams three concerns onto one page:
search form, an always-visible passenger-details form, and results. The result
cards show only `BKK -> KIX` + a price, there's no sorting, and the passenger
form is permanent clutter. Skyscanner separates **search → results → passenger
details** and shows rich, sortable result cards.

This redesign keeps **one screen** but restructures it to a Skyscanner-style
**search card on top + sortable results below**, and moves passenger details into
a **modal that only opens on Book**.

### Grilled decisions (locked)
1. **Structure** — one screen: search card + results list. Passenger details
   leave the search view; collected at the booking step.
2. **Booking step** — tapping **Book** opens a **modal sheet** with the passenger
   form + confirm. (Consistent with the airport/date-picker modals already used.)
3. **Result card** — Skyscanner-style: airline, depart→arrive times, duration,
   stops, price + Select.
4. **Sorting** — three user-selectable tabs: **Cheapest / Fastest / Best**.

---

## 2. Current state (what exists, reuse it)

| Piece | Location | Reuse |
|---|---|---|
| Airport picker (overlay search) | `trailr/src/components/AirportInput.tsx` | as-is |
| Date picker w/ price calendar | `trailr/src/components/DatePicker.tsx` (`prices`, `minDate`, `onViewMonthChange`) | as-is |
| Price calendar hook | `useFlightPriceCalendar` (`@trailr/db`) | as-is |
| Offer search hook | `useOfferSearch` (`@trailr/db`) | as-is |
| Create booking hook | `useCreateBooking` (`@trailr/db`) | as-is |
| Flight summary helpers | `trailr/src/lib/bookingDisplay.ts` (`flightSummaryFromMeta`, `flightRowLine`, `formatDuration`) | drives the new card |
| Theme tokens | `trailr/src/theme/tokens.ts` (`colors`, `spacing`, `radius`, `shadow`, `fontSize`) | all styling |
| Buttons / press | `Btn`, `PressableScale`, `Toast` | as-is |

The existing search state (`origin`, `destination`, `departDate`, `returnDate`,
`tripType`, swap, `handleDepartChange`, `handleTripTypeChange`, the two
`*ViewMonth` states and price-calendar queries) is correct — **keep it**. This
spec changes layout + the results/booking presentation, not the search wiring.

---

## 3. Layout overview

```
┌─────────────────────────────────────────────┐
│ TopBar (active="Book")                       │
├─────────────────────────────────────────────┤
│  Flights                         [Stays →]   │  header
│  ┌─────────────────────────────────────────┐ │
│  │ ( One way ) ( Round trip )              │ │  SEARCH CARD
│  │ [From ⇄ To] [Depart] [Return?]          │ │  (one elevated card)
│  │              [ Search flights ]          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  N results            [Cheapest|Fastest|Best] │  results header + sort tabs
│  ┌─────────────────────────────────────────┐ │
│  │ <FlightResultCard>                       │ │  results list
│  │ <FlightResultCard>                       │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
        ↑ tap Book → <PassengerModal>
```

Passenger details (first/last/DOB/email/phone) are **removed** from the page
body and live only inside `<PassengerModal>` (§6).

---

## 4. Search card — `<SearchCard>`

Wrap the trip-type pills + route row + dates + search button in **one elevated
card** (`backgroundColor: colors.paper`, `borderRadius: radius.lg`,
`...shadow.sm`, `padding: spacing.lg`, `gap: spacing.md`). This is the single
biggest visual win over the current flat wrapping row.

- **Trip-type pills** — keep the existing `One way / Round trip` pills, placed at
  the top of the card.
- **Route row** — `AirportInput` From, the `⇄` swap button, `AirportInput` To.
  On wide screens these sit on one line; allow wrap on narrow.
- **Dates** — `Depart` always; `Return` only when `tripType === 'round-trip'`,
  with `minDate={departDate}`. Both keep the price-calendar `prices` +
  `onViewMonthChange` wiring already present.
- **Search button** — full-width `Btn solid` inside the card,
  `onPress={() => setSubmitted(draft)}`, `loading={offersQ.isFetching}`.

No new search logic — only the visual grouping changes.

---

## 5. Results

### 5.1 Results header + sort tabs
Above the list, a row: left = count (`{offers.length} results`), right = three
sort pills reusing the trip-type-pill visual style (active = `colors.ink` fill,
`colors.paper` text):

| Tab | Sort key |
|---|---|
| **Cheapest** | `amount_thb` ascending |
| **Fastest** | total duration ascending |
| **Best** | normalized blend, ascending (see below) |

State: `const [sort, setSort] = useState<'cheapest'|'fastest'|'best'>('best')`.
Default = **Best**. Sorting is **client-side** over `offersQ.data` (no backend
change). Hide the header + tabs until there are ≥2 results.

**Duration for sorting** — derive minutes from the offer meta. Prefer
`meta.duration` (ISO-8601 like `PT6H7M`) parsed to minutes; fall back to
`arr_at − dep_at`. Add a helper `flightDurationMinutes(meta): number` next to the
existing helpers in `bookingDisplay.ts` (it already parses ISO durations in
`formatDuration`/`durationFromMinutes` — factor the minute-parse out and reuse).

**Best score** (normalize each metric to 0..1 across the current result set, then
average):
```
priceN = (price - minPrice) / (maxPrice - minPrice || 1)
durN   = (dur   - minDur)   / (maxDur   - minDur   || 1)
score  = 0.5 * priceN + 0.5 * durN   // lower = better
```
Sort by `score` ascending. (Equal weighting; tweak later if desired.)

Memoize the sorted list with `useMemo` keyed on `offers` + `sort`.

### 5.2 Result card — `<FlightResultCard>`
Build the card from `flightSummaryFromMeta(offer.meta)`. Layout (one row,
wraps to stacked on narrow):

```
┌───────────────────────────────────────────────────────────┐
│  Japan Airlines                                            │  airline (carrier_name)
│  07:25  ──────✈──────  14:30+1     6h 07m                  │  times + duration
│  BKK        non-stop        KIX     ¥… → 6,630 THB         │  codes + stops + price
│                                            [ Select ]      │
└───────────────────────────────────────────────────────────┘
```

Field mapping (all from `flightSummaryFromMeta`):
- **Airline** — `carrier_name ?? carrier ?? 'Flight'`.
- **Depart time** — `timeFromIso(dep_at)`; **Arrive time** — `timeFromIso(arr_at)`
  with the existing `+N` overnight marker (already implemented in
  `arrWithDayMarker`). Times are the prominent element (≥ `fontSize.lg`, bold).
- **Route codes** — `origin` under depart time, `destination` under arrive time.
- **Middle** — duration (`formatDuration(duration)`), and `non-stop` /
  `{stops} stop(s)` below it. A thin connector line between the two times is a
  nice-to-have, not required.
- **Price** — `money(offer.amount_thb)` (`{n.toLocaleString()} THB`), bold,
  right-aligned.
- **Select** — `Btn solid sm`, `loading` while that offer is being booked,
  `onPress` → open `<PassengerModal>` for this offer (§6).

Keep the card styling consistent with the current `offerCard` (border
`colors.line`, `radius.md`, `...shadow.sm`) but taller to fit two text rows.

### 5.3 States
Preserve current behavior:
- error → `Could not search flights.`
- fetching & empty → `ActivityIndicator`
- submitted & empty → `No fares found. Try another route or date.`

---

## 6. Passenger modal — `<PassengerModal>`

A centered modal (same backdrop/sheet pattern as the date modal:
`rgba(44,42,38,0.45)` backdrop, `colors.paper` sheet, `radius.lg`, `shadow.md`,
`maxWidth: 460`).

- **Trigger** — opening sets `selectedOffer`; the modal renders when
  `selectedOffer != null`.
- **Header** — `Passenger details` + ✕ close, and a one-line summary of the
  chosen flight (airline · route · price) so the user knows what they're booking.
- **Fields** (reuse the existing inputs/`DateField`):
  - First name *(required)*, Last name *(required)*
  - Date of birth — `DateField initialYear={1990}` *(recommended)*
  - Email, Phone *(optional)*
- **Confirm** — `Btn solid`, disabled until first + last name are non-empty.
  On press, call the **existing** `book(selectedOffer)` logic (currently in
  `flights.tsx`), reading the modal's local field state. Keep the auth gate
  (`if (!user) router.push('/sign-in')`), the `tripId` attach, and the
  success/error toasts unchanged.
- On success → close modal, clear fields.

> The current `book()` only attaches `passenger_details` when first+last are
> present; that's why first+last are the required gate here. DOB/email/phone are
> needed for **actual Duffel ticketing** — recommend collecting them, but don't
> hard-block the booking on them (matches current behavior).

---

## 7. Backend gap — round-trip return leg (required for correct round-trip cards)

`trailr` already sends `return_date` and the Duffel provider adds the return
**slice** to the offer request
(`api/src/modules/bookings/providers/duffel.provider.ts`). **But** the provider
maps only `offer.slices?.[0]` into `meta`, so the **return leg is invisible** in
the result card. For a faithful round-trip card the implementer must:

1. In `duffel.provider.ts`, map **all** slices into the offer meta, e.g.
   `meta.slices: [{ summary fields per slice }]` (origin, destination, dep_at,
   arr_at, carrier, carrier_name, flight_number, stops, duration, segments),
   keeping the existing top-level fields as the outbound for backward compat.
2. Extend `FlightSummary`/helpers in `bookingDisplay.ts` to read a slices array
   (fall back to the single-slice fields when `meta.slices` is absent).
3. `<FlightResultCard>` renders **two legs** (Outbound / Return) stacked when a
   round-trip offer has two slices; one leg otherwise.

If this backend change is out of scope for the first pass, the card should at
least **label** round-trip offers as round-trip and show the outbound leg + total
price (no silent implication that it's one-way).

---

## 8. Out of scope / keep as-is
- Price-calendar estimation logic (`bookings.service.priceCalendar`) — unchanged.
- Search wiring, swap, date-sync, trip-type pre-fill — unchanged.
- Filters (airlines, stops, times-of-day, baggage) — **not** in this pass.
- "Best" weighting tuning — ship 50/50, revisit later.

---

## 9. Acceptance checklist
- [ ] Search controls live in one elevated card; no passenger fields on the page body.
- [ ] Results show airline, depart→arrive times (+overnight marker), duration,
      stops, price, and a Select button.
- [ ] Cheapest / Fastest / Best tabs re-sort the list client-side; Best is default.
- [ ] Tapping Select opens the passenger modal pre-summarizing the chosen flight;
      Confirm books via the existing flow with unchanged toasts/auth/trip-attach.
- [ ] Round-trip: return leg shown (after §7) or at minimum clearly labeled.
- [ ] One-way and round-trip search both return and render correctly.
- [ ] `npx tsc --noEmit` clean in `trailr/` (and `api/` if §7 done).
