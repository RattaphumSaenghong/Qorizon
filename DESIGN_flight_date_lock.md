# Design — Flight Date Validation & Locked Logistics Cards

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Date:** 2026-06-25
> **Pairs with:** `DESIGN_planner_logistics.md` (flight/hotel logistics blocks),
> `DESIGN_bookings.md` (booking model), `NEXT.md` item 3 (Duffel).
> **Implements:** flight-to-trip date guard + "source of truth = booking" lock in the builder.

---

## 1. What & why

A flight enters a trip through three paths today:

1. **Email ingestion → match** — `IngestionService.match()` ([api/src/modules/ingestion/ingestion.service.ts:62](trailr/api/src/modules/ingestion/ingestion.service.ts)) turns an unmatched `InventoryItem` into a stop with `planned_start: parsed.dep_time ?? parsed.check_in ?? null`.
2. **Search/book** — `BookingSearchModal` → `createStop` (flight category).
3. **Backpack** — `addBackpackBooking` drops a booked flight into Unsorted.

Nothing checks that the flight's departure actually falls inside the trip's dates, and the builder treats a flight stop like any freely-editable stop. We want flights to behave as **scheduled, booking-owned** items: validated against the trip window, displayed with a locked date/time, and editable only at the source.

### Success criteria
- A flight whose departure is clearly outside the trip window is flagged before it's attached (not silently added).
- Flight logistics cards render their date/time as **read-only**; there is no reorder/drag (already true — see §3).
- "Change the flight" routes the user to the booking/inventory source, not to free-editing the card.
- No false-rejects on the common cases: missing dates, red-eyes, day-before positioning, next-day arrival.

---

## 2. Server-side date guard — **soft now, hard later**

> **Why soft first.** The only structured-ish date we have today is `parsed.dep_time`, which is **regex-scraped from email text** ([ingestion.service.ts:147-154](trailr/api/src/modules/ingestion/ingestion.service.ts)) — frequently missing or wrong. And `trip.start_date`/`end_date` are **nullable** ([schema.prisma:93-94](trailr/api/prisma/schema.prisma)). A hard reject on unreliable data blocks legitimate bookings with a confusing error. So validate softly until Duffel gives real timestamps (§4).

**Rule** (applied in `match()`, and ideally on the search/book path too):

```
canValidate = trip.start_date != null && trip.end_date != null && depDate parses
if (!canValidate)        → allow (cannot judge)
if (within [start-1d, end+1d]) → allow
else                     → soft-reject: surface a warning the client can override
```

- **±1 day tolerance**, date-only. `dep_time` is local airport time; trip dates are `@db.Date`. Red-eyes and positioning flights legitimately sit a day outside.
- **Soft-reject shape:** return a structured `409` (or a `{ warning, can_override }` field) rather than a hard `400`, so the builder can prompt *"This flight departs <date>, outside your trip (<start>–<end>). Add anyway?"* and re-call with `?force=true`.
- Helper lives next to the matcher; unit-test the boundary cases (null dates, unparseable dep_time, ±1 day edges).

When this is wanted on the **search/book** and **backpack** paths too, factor the check into one `assertFlightInTripWindow(trip, depDate)` used by all three.

---

## 3. Builder display lock

- **Reorder/drag: already absent.** Flights render in `LogisticsBlock` ([src/builder/components.tsx:159](trailr/src/builder/components.tsx)), which only exposes **edit + remove**. The up/down handles live in `StopCard`/`DraggableStopRow`, used only inside day/unsorted sections. Flights have no timeline position — nothing to build here.
- **Locked date/time chip:** show the flight's departure date/time as a non-interactive chip on the logistics card. Cheap, display-only.
- **Resolve the edit-modal inconsistency (decision required).** Today `openEdit` opens the generic stop modal for a flight, letting the user freely edit name/time/cost — which contradicts "edit the source." Pick one:
  - **(a) Source-of-truth (recommended):** for imported/booked flights, replace the edit affordance with a link to the booking/inventory item; disable free edits.
  - **(b) Display-only lock:** keep edits open but treat the date chip as informational. Simpler, weaker guarantee.
  - This doc assumes **(a)**.

---

## 4. Duffel sequencing (makes the hard lock safe)

The current Duffel provider ([api/src/modules/bookings/providers/duffel.provider.ts](trailr/api/src/modules/bookings/providers/duffel.provider.ts)) parses offer price + slice duration but **does not capture segment-level `departing_at` / `arriving_at` / origin / destination IATA**. Those fields are exactly what turns this design from "validating a regex guess" into "validating real data."

**Plan:**
1. Extend `DuffelOffer.slices[].segments[]` parsing to pull `departing_at`, `arriving_at`, `origin.iata_code`, `destination.iata_code`, and `marketing_carrier`.
2. Store them on the offer `meta` (and onto the stop when booked) so the builder can render a **proper flight detail card** (route, times, carrier) instead of a generic stop.
3. **Flip the date guard from soft → hard** once flights carry structured `departing_at`: now a reject is trustworthy.

Until Duffel is live, ingestion stays soft (§2).

---

## 5. Build order
1. `assertFlightInTripWindow` helper + soft guard in `match()` + override path. *(verify: unit tests, manual import outside-window flight)*
2. Locked date/time chip on the logistics card. *(verify: browser)*
3. Edit-modal decision (a) — link to source for booked/imported flights. *(verify: browser)*
4. **[with Duffel]** segment timestamp/airport parsing + flight detail card. *(verify: live BKK→KIX search)*
5. **[with Duffel]** promote guard to hard reject on structured `departing_at`.
