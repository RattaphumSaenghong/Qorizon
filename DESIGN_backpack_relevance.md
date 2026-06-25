# Design — Backpack Relevance Gating + Locked Booked Logistics

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Date:** 2026-06-25
> **Pairs with:** `DESIGN_booking_detail.md` (BookingDetailRow / meta), the Backpack panel +
> `addBackpackBooking` in `trailr/app/builder/[id].tsx`, `DESIGN_planner_logistics.md`.

---

## 1. What & why

Two rules for pulling **bookings** (flights / stays) from the Backpack into a trip:

1. **Relevance gating.** A booking whose dates don't fall inside the trip's dates **can't be
   added**, and the user is told why. Example: a flight on **Sep 12** can't be dropped into a
   **Jun 1–7** trip — adding it would be nonsense.
2. **Booked logistics are locked.** Once a *booked* flight/stay is in the trip, it **can't be
   dragged/reordered**. A flight departs at a fixed datetime; a hotel sits at one place for fixed
   nights. The planner must reflect reality, not let the user move a real reservation around.

> Scope: these rules apply to **booking-backed** logistics (have an `external_ref` / linked
> `Booking`). **Manually-added** flights/stays and ordinary day-stops keep today's free
> drag/edit behaviour.

---

## 2. The blocker: Backpack bookings carry no dates

`addBackpackBooking(booking: BookingRow)` ([`builder/[id].tsx:716`](trailr/app/builder/[id].tsx))
takes the **thin** `BookingRow` from `useBookings()`. `BookingRow` has **no dates** — the
flight depart date / hotel check-in–out live in `raw_payload.meta`, which `toBookingRow()` drops
([`bookings.service.ts:154`](api/src/modules/bookings/bookings.service.ts)). So the Backpack card
literally doesn't know when the booking is, and can't gate on it.

### Decision: add lightweight, normalized date fields to `BookingRow`
The Backpack needs dates on **every** card (for the relevance check + day placement), so put them
on the thin row rather than fetching `BookingDetailRow` per card. Derive them in `toBookingRow()`
from `meta`:

```ts
// packages/shared/src/bookings.ts — extend BookingRow (additive, nullable)
export interface BookingRow {
  // …existing…
  starts_on: string | null; // YYYY-MM-DD — flight depart date / hotel check-in
  ends_on: string | null;   // YYYY-MM-DD — hotel check-out; = starts_on for flights
}
```

```ts
// bookings.service.ts — toBookingRow(): pull from meta, tolerate provider shape drift
const meta = (raw.meta ?? {}) as Record<string, unknown>;
const startsOn = ymd(meta.check_in ?? meta.depart_date ?? meta.start_date ?? meta.date);
const endsOn   = ymd(meta.check_out ?? meta.end_date) ?? startsOn;
// ymd(): coerce a string/Date-ish to 'YYYY-MM-DD' or null
```

> **Meta-shape caveat (verify against real data):** hotel rates write `check_in`/`check_out`
> (see `stays.tsx`); Duffel/mock flights and **email-ingested** bookings may use different keys
> (`depart_date`, segment times, etc.). `ymd()` should try a small ordered list of keys and return
> `null` if none parse — a `null`-dated booking is treated as **undatable** (§3 fallback). Rebuild
> `@trailr/shared` then `api` after this change (`[[trailr-api-run-mode]]`).

---

## 3. Rule 1 — Relevance gating (date overlap)

### Helper — `trailr/src/lib/bookingRelevance.ts` (new)
```ts
export type Relevance =
  | { ok: true }
  | { ok: false; reason: string };

// trip range is [tripStart, tripEnd] (YYYY-MM-DD). Either may be null.
export function bookingRelevance(
  b: { type: 'flight' | 'hotel'; starts_on: string | null; ends_on: string | null },
  tripStart: string | null,
  tripEnd: string | null,
): Relevance {
  if (!tripStart || !tripEnd) return { ok: true };        // trip undated → can't judge, allow
  if (!b.starts_on) return { ok: true };                  // booking undated → allow (can't judge)

  if (b.type === 'flight') {
    // depart date must sit within the trip (±1 day grace for redeye/arrival).
    if (within(b.starts_on, tripStart, tripEnd, 1)) return { ok: true };
    return { ok: false, reason: `Departs ${fmt(b.starts_on)} — outside your trip (${fmt(tripStart)}–${fmt(tripEnd)})` };
  }
  // hotel: [check_in, check_out] must OVERLAP the trip range.
  const inEnd = b.ends_on ?? b.starts_on;
  if (overlaps(b.starts_on, inEnd, tripStart, tripEnd)) return { ok: true };
  return { ok: false, reason: `${fmt(b.starts_on)}–${fmt(inEnd)} — doesn't overlap your trip (${fmt(tripStart)}–${fmt(tripEnd)})` };
}
```
- `within(d, a, b, graceDays)`, `overlaps(s1,e1,s2,e2)`, `fmt('2026-09-12') → 'Sep 12'` — plain
  date math (reuse `src/lib/date.ts` if helpers exist).
- Trip range: `trip.start_date` / `trip.end_date`, falling back to the first/last `dayRows.date`
  (the builder already computes `firstDate`/`lastDate`).

### UI in the Backpack (`builder/[id].tsx`, the BOOKINGS section of `backpackTabContent`)
For each booking card compute `const rel = bookingRelevance(b, tripStart, tripEnd);`
- **Relevant** → normal **Add** button → `addBackpackBooking(b)`.
- **Irrelevant** → **disable** the Add button; render `rel.reason` as muted helper text under the
  card (e.g. "Departs Sep 12 — outside your trip (Jun 1–7)"). Keep the card visible so the user
  understands *why* it's unavailable rather than it silently missing.
- **Belt-and-braces:** also guard inside `addBackpackBooking` — bail + `toast(rel.reason)` if a
  disabled path is somehow hit, so the rule holds even if the button state lags.

> Post locations (the POST LOCATIONS section) are **not** date-gated — they're places, not
> time-bound reservations. Rule 1 applies to the BOOKINGS section only.

---

## 4. Rule 2 — Booked logistics are locked (can't move)

### 4.1 Place by date on add (not Unsorted)
Today `addBackpackBooking` creates the stop with `day_id: null` (Unsorted). Instead, **anchor it**:
- Find the trip day whose `date === booking.starts_on`; set that `day_id`. If no day matches the
  date (but it passed the relevance check, so it's in-range), fall back to `day_id: null` with the
  date recorded so it can be auto-placed when that day exists.
- Persist the booking date onto the stop: set `planned_start = booking.starts_on` (and for hotels,
  carry `nights`/`ends_on` in `notes`/meta) so the timeline knows its fixed position.

### 4.2 Mark the stop as locked
A stop is **locked** when it is logistics **and** backed by a booking. Detect via the existing
linkage: a `Booking` row has `stop_id` ([`bookings.service.ts:101`](api/src/modules/bookings/bookings.service.ts)),
and `BookingDetailRow.stop_id` is already exposed. Simplest for the builder:
- `addBackpackBooking` / `createStayBooking` tag the created stop (e.g. `notes` sentinel or a
  dedicated field) so `isBookedLogistics(stop)` is a pure check. Prefer a real signal over a notes
  string if the `Stop` model can carry it; otherwise derive from "category ∈ {flight,hotel} and a
  Booking references this stop_id" via the trip's bookings list.

### 4.3 Disable drag + reorder for locked stops
- **Drag:** in `DraggableStopRow` / the logistics rendering, when `isBookedLogistics(stop)`, render
  a **non-draggable** row — don't attach `useDraggable` listeners; show a small 🔒 / "booked" chip
  instead of the `⠿` drag handle.
- **Reorder arrows / day reassignment:** hide the ▲▼ controls and block drop-targeting for these
  stops (the `handleDragEnd` path should ignore a locked stop id).
- **Hotel = one place, spanning nights:** the stay anchors to its check-in day at its fixed
  location; it can't be dragged to another day or reordered. (Showing it across each night is a
  nice-to-have — out of scope for v1; v1 just pins it to check-in day, locked.)

> Manually-added logistics (no booking) stay editable/movable — only real reservations lock.

---

## 5. File-by-file
| File | Action |
|---|---|
| `packages/shared/src/bookings.ts` | add `starts_on` / `ends_on` to `BookingRow` |
| `api/src/modules/bookings/bookings.service.ts` | `toBookingRow()` derive `starts_on`/`ends_on` from meta (+ `ymd()` helper) |
| `trailr/src/lib/bookingRelevance.ts` | **new** — `bookingRelevance()` + date helpers |
| `trailr/app/builder/[id].tsx` | gate the Backpack BOOKINGS Add (disable + reason); anchor-by-date + lock in `addBackpackBooking`; `isBookedLogistics()`; disable drag/reorder for locked stops |
| `packages/db/src/types/database.ts` | mirror the `BookingRow` date fields |

---

## 6. Open decisions / TODO
- [ ] **Grace window for flights** — strict overlap, or ±1 day (redeye departs 23:55, arrives next
      day; return flight on trip's last day)? Spec uses ±1 day; confirm.
- [ ] **Undated bookings** (`starts_on === null`, e.g. sparse email-ingested) — current rule:
      **allow** (can't judge) and add to Unsorted unlocked. Alternative: surface a "no date —
      can't place" hint. Default: allow.
- [ ] **Locked-stop signal** — clean field on `Stop` vs deriving from the bookings list vs a notes
      sentinel. Prefer a real field if the model can take one (avoids brittle string checks).
- [ ] **Multi-night hotel rendering** — pin to check-in day (v1) vs span every covered day (later).
- [ ] **Editing a locked stop** — can the user still edit notes/cost, or fully read-only? Suggest:
      allow notes, block date/day/position (those come from the reservation).
- [ ] **Removing** a locked stop from the trip should NOT cancel the booking — it just detaches the
      itinerary block (keep the `Booking` row; only delete the `Stop`).

---

## 7. Phases (each verifiable)
1. **Dates on `BookingRow`** — extend type + `toBookingRow()`; curl `GET /bookings` and confirm
   `starts_on`/`ends_on` populated for a hotel and a flight booking.
2. **Relevance helper + unit-ish check** — `bookingRelevance()` with a Sep-flight / Jun-trip case
   returning `{ ok:false, reason }`, and an in-range case returning `{ ok:true }`.
3. **Gate the Backpack UI** — disabled Add + reason text on irrelevant bookings; verify in the
   builder with a seeded out-of-range booking.
4. **Lock booked logistics** — anchor-by-date on add, `isBookedLogistics`, drag/reorder disabled;
   verify a booked flight can't be dragged and a booked stay can't be moved off its day.
