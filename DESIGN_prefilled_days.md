# Design — Pre-filled days from trip dates

> Status: **PLAN ONLY — not implemented.**
> Goal: when a trip has a date range (e.g. **10 Jul → 20 Jul**), the builder should
> open with **one day per date already created** (Day 1 = 10 Jul … Day 11 = 20 Jul).
> The user can still **add** and **delete** days. Deleting a day must **not** delete
> the stops inside it — they fall back into the **unorganized pool**.

---

## 1. Current state (what exists today)

- **Trip creation makes zero days.** `new-trip.tsx` collects `start_date`/`end_date`
  (via `DateRangePicker`) and `createTrip` stores them, but `TripsService.create`
  ([trips.service.ts:108](api/src/modules/trips/trips.service.ts#L108)) creates only the
  trip row. The builder therefore opens empty ("＋ Add day" hero).
- **Days are add/edit only.** `POST /trips/:id/days` (append, `day_number = max+1`) and
  `PATCH /trips/:id/days/:dayId` (edit `place`/`date`). **There is no delete-day**
  endpoint or UI today.
- **The pool already exists.** The builder groups stops with `day_id === d.id` under each
  day and renders `day_id === null` stops as the **"unassigned"** pool
  ([builder/[id].tsx:433](trailr/app/builder/[id].tsx#L433)). Drag-and-drop already moves
  stops between days and the pool by patching `stop.day_id`.
- **"Move to pool on delete" is free.** `Stop.day` is `onDelete: SetNull`
  ([schema.prisma:211](api/prisma/schema.prisma#L211)) — deleting a `TripDay` row sets its
  stops' `day_id` to `null` at the DB level, i.e. they automatically land in the pool.
  No data is lost.
- **Logistics are separate.** Flights/hotels are pulled out into their own lanes
  (`flightStops`/`stayStops`) and are not attached to days — unaffected by any of this.

> Net: the hard part (pool semantics) is already in place. This feature is mostly
> (a) generate days at creation, and (b) add a delete-day action.

---

## 2. Design

### 2a. Generate days at trip creation (the core)

When a trip is created **with both `start_date` and `end_date`**, generate one `TripDay`
per calendar date, inclusive:

```
count = (end_date − start_date) in days + 1
for i in 0 … count−1:
  TripDay { day_number: i+1, date: start_date + i days, place: null }
```

- **Where:** in `TripsService.create`, inside a transaction with the trip insert, so the
  trip + its days are created atomically (one POST, no client round-trips).
- **No dates → no days.** If either date is missing, create zero days (today's behaviour);
  the user builds days manually. Unchanged.
- **`date` is the source of order.** `day_number` is 1..N matching date order; each day
  carries its `date` so the builder header can show "Day 3 · Sat 12 Jul".

> Note on the "69" in 10-7-69 → that's just how the date was typed (Thai BE short year).
> The `DateRangePicker` already emits ISO **CE** dates (`YYYY-MM-DD`) and the DB stores
> `@db.Date`, so no calendar conversion is involved here — we generate from the stored
> ISO dates.

### 2b. Add a day (already works, minor polish)

`POST /trips/:id/days` stays. Small improvement: when the trip has dates and the appended
day extends past `end_date`, either (i) leave its `date` null (a manual extra day), or
(ii) set `date = lastDate + 1`. Recommend **(i) null** — an explicitly added day past the
planned range is "extra", and we don't silently widen the trip's dates.

### 2c. Delete a day (new) → stops go to the pool

New capability:

- **Backend:** `DELETE /trips/:id/days/:dayId` → `TripsService.removeDay(userId, tripId, dayId)`,
  owner-only. Implementation is a single `prisma.tripDay.delete(...)`; the `onDelete: SetNull`
  FK moves that day's stops to `day_id = null` (the pool) automatically. Logistics already
  have no `day_id`, so they're untouched.
- **Renumbering:** after a delete, remaining days have a gap (Day 1, 3, 4…). Re-sequence
  `day_number` to 1..N within the same transaction so the board reads cleanly. (Display
  could instead use sorted index, but persisting clean `day_number`s keeps the data tidy
  and matches how "add day" computes `max+1`.)
- **Frontend:** a delete affordance on each day header (e.g. a `✕` next to the existing
  `✎` edit), behind a confirm that states the consequence:
  *"Delete Day 3? Its 4 stops move to Unsorted — they won't be deleted."*
  On success, invalidate days + stops; the pool section shows the rescued stops.
- **Empty-pool affordance:** the "unassigned" section should always render its drop zone
  when there are pool stops (already does) and show a short hint the first time stops land
  there from a deletion.

### 2d. Naming

The current internal name is "unassigned". For users, surface it as **"Unsorted"** (or
"Pool"/"Ideas") — a labelled lane at the top or bottom of the board where un-dated stops
live. Pick one label and use it consistently (header + delete-day confirm copy).

---

## 3. Date-range edits *after* creation (decision needed)

If the user later changes the trip's `start_date`/`end_date`, the pre-generated days can
drift from the new range. Three options:

| Option | Behaviour | Trade-off |
|---|---|---|
| **A. Don't touch days** (recommend v1) | Editing trip dates leaves existing days as-is; user adds/deletes days manually. | Simplest, no surprises, no stop loss. Days can mismatch the new range until the user fixes them. |
| **B. Additive reconcile** | Extending the range **appends** new empty days; shrinking **moves** out-of-range days' stops to the pool and deletes those days. Never deletes stops. | Keeps days roughly in sync; more logic; shrinking silently removes day structure. |
| **C. Full regenerate** | Wipe days, recreate from new range; all stops → pool. | ❌ Destroys manual day organisation. Don't. |

Recommend **A for v1** (matches "user can still add or delete"), with **B** as a later
enhancement if syncing proves desirable. Whatever we pick, the invariant holds: **stops are
never deleted by day operations — they go to the pool.**

A related sub-decision: trip dates aren't even editable via the API yet for `stage`-style
fields — `UpdateTripDto` has `start_date`/`end_date`, so they *are* editable. If we adopt
B later, the reconcile runs in `TripsService.update` when the dates change.

---

## 4. Edge cases & guards

- **Huge ranges:** cap generated days (e.g. **60**). Beyond the cap, create the first 60
  and surface a notice, or refuse with a validation error. Prevents a typo (2026 vs 2126)
  from creating thousands of rows.
- **Inverted range** (`end < start`): validate at creation; treat as no range (0 days) or
  reject. `DateRangePicker` should already prevent this — belt-and-suspenders in the DTO.
- **Single-day trip** (`start === end`): 1 day. Fine.
- **Forking:** `fork()` already copies days/stops; unaffected. New trips via fork keep the
  source's day structure, not date-generated days — that's correct.
- **Existing trips:** no backfill. They keep whatever days they have; this only changes the
  creation path going forward.

---

## 5. File-by-file (when implemented)

| File | Change |
|---|---|
| `api/src/modules/trips/trips.service.ts` | `create()` → wrap in `$transaction`; if both dates present, `tripDay.createMany` for the inclusive range (capped). Add `removeDay(userId, tripId, dayId)` → delete day + re-sequence `day_number`. |
| `api/src/modules/trips/trips.controller.ts` | Add `DELETE /:id/days/:dayId` → `removeDay`. |
| `packages/db/src/queries/trips.ts` | Add `deleteTripDay(tripId, dayId)`. |
| `packages/db/src/hooks/useTrip.ts` | Add `useDeleteTripDay(tripId)` (invalidate `['trip', tripId, 'days']` + stops). |
| `trailr/app/builder/[id].tsx` | Day header: add `✕` delete with confirm ("…stops move to Unsorted"); relabel "unassigned" → "Unsorted"; ensure pool renders after a delete. No change to drag/drop. |
| `api/src/modules/trips/dto/create-trip.dto.ts` | (Optional) validate range / cap day count. |

No schema or migration changes — `TripDay.date`, nullable `Stop.day_id`, and the
`onDelete: SetNull` FK already support everything here.

---

## 6. Open questions

1. **Day-range edit after creation:** confirm **Option A** (manual) for v1, or do you want
   additive reconcile (**B**) now?
2. **Pool label:** "Unsorted", "Pool", or "Ideas"?
3. **Day cap:** is 60 the right ceiling, or higher (long trips)?
4. **Added day past range:** date = null (recommended) or auto-continue the dates?
