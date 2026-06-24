# Design — Past-date guard + "Log a past trip"

> Status: **PLAN ONLY — not implemented.**
> Two related changes around the new "a trip can't start in the past" rule:
> 1. **Client-side guard** — the date picker greys out disallowed days so users are
>    stopped *before* submitting (today the server returns a 400 after the fact).
> 2. **"Log a past trip" exception** — a deliberate way to create a *backdated* trip
>    (an album/journal of a trip you already took), which is allowed to use past dates.

These are intentionally opposite: planning forbids the past, logging requires it. The
same date picker and new-trip screen serve both by switching a min/max bound and a flag.

---

## Background (what exists)

- **Server rule (just shipped):** `TripsService.create` calls `assertNotPast(start_date)`
  → `400 "Trip can't start in the past"`. Scoped to `create` only; seeding bypasses it
  (writes via `PrismaClient`). ([trips.service.ts](api/src/modules/trips/trips.service.ts))
- **Date picker:** `DateRangePicker` ([DateRangePicker.tsx](trailr/src/components/DateRangePicker.tsx))
  is a custom month grid. It has **no min/max** support — every day is pressable, including
  past ones. It already tracks `today` (for the "today" dot).
- **New trip:** `new-trip.tsx` is framed "Stage 1 of 3 · Planning"; creates
  `status: 'draft'`, `stage: 'planning'`, and now surfaces the 400 as a toast.
- **Stages & statuses:** `stage ∈ planning | living | album`; `status ∈ draft | active |
  completed | archived`; `stop.status ∈ planned | visited | skipped`. `tripHref` routes
  `album → /album`, `living → /journal`, else `/builder`.

---

## Feature 1 — Client-side past-date guard

### Design
Add optional bounds to `DateRangePicker`:

```ts
interface Props {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  minDate?: string;   // YMD; days before this are disabled
  maxDate?: string;   // YMD; days after this are disabled
}
```

- **Disabled test:** `isDisabled(ymd) = (minDate && ymd < minDate) || (maxDate && ymd > maxDate)`.
- **Render:** disabled cells get a muted text colour (`colors.sub` at low opacity) and the
  `Pressable` is `disabled` (and `handleDay` early-returns for them as belt-and-suspenders).
- **Backward compatible:** no `minDate`/`maxDate` → today's behaviour (all days pressable).
- **new-trip (plan mode):** pass `minDate={todayYMD}` → past days greyed out.
- **Optional polish:** disable the `‹` month-nav button when the entire previous month is
  before `minDate` (or just leave nav free and rely on greyed cells — simpler, recommend
  leaving nav free for v1).

### Files
| File | Change |
|---|---|
| `trailr/src/components/DateRangePicker.tsx` | Add `minDate`/`maxDate` props; `isDisabled`; disabled styling + non-pressable; guard in `handleDay`. |
| `trailr/app/new-trip.tsx` | Pass `minDate={todayYMD}` in plan mode (see Feature 2 for log mode's `maxDate`). |

No backend change — this is purely a nicer front door to the rule already enforced server-side.

---

## Feature 2 — "Log a past trip"

A trip you already took: you want to record it (stops, photos) as an album/journal, so it
**must** accept past dates. This is a legitimate exception to the planning rule.

### 2a. Backend — opt-in bypass

Add an explicit intent flag to `CreateTripDto`:

```ts
@IsOptional() @IsBoolean()
backdated?: boolean;     // true = logging a past trip; skips the not-past check
```

In `TripsService.create`:
```ts
if (!dto.backdated) assertNotPast(dto.start_date);
```

- **Why an explicit flag (not derived from stage/status):** intent is unambiguous and the
  rule stays decoupled from stage semantics. The flag is not a security control — it's a UX
  guardrail — so it being client-settable is fine.
- **Prefill still works:** `buildPrefilledDates` only checks inverted-range + the 60-day
  cap, neither of which involves "past", so a backdated 10–20 Jul trip still prefills 11 days.
- **`backdated` is not persisted** unless we want a column — it only gates the check at
  creation. (See Open Q3 on whether to store it.)

### 2b. Frontend — one screen, two modes

Reuse `new-trip.tsx` with a top mode toggle rather than a second screen:

```
( • Plan a trip ) ( Log a past trip )
```

| Mode | Picker bound | DTO sent |
|---|---|---|
| **Plan** (default) | `minDate = today` | `status: 'draft'`, `stage: 'planning'`, `backdated: false` |
| **Log past** | `maxDate = today` | `status: 'completed'`, `stage: 'album'` (or `'planning'` — see Open Q1), `backdated: true` |

- Copy adapts: header "Stage 1 of 3 · Planning" → "Logging a past trip"; CTA "Create trip"
  → "Create album"; hint text changes accordingly.
- After create, route by the resulting stage via `tripHref` (album → `/album`, else
  `/builder`) — consistent with the profile-card routing we already use.

### 2c. What a logged trip looks like (the real modelling question)

A past trip's stops describe places you **visited**, not planned. Two depths:

- **v1 (recommended, minimal):** create the trip backdated with `stage: 'album'` /
  `status: 'completed'`; the user adds stops in the builder as today. Stops still default to
  `planned` — acceptable for v1; the album view just shows them. Ship the date exception
  first.
- **v2 (nicer):** stops added to a backdated/album trip default to `status: 'visited'`, so
  the map/album reflect reality without manual marking. Requires the stop-create path to
  know the trip is "past" (either persist `backdated`/derive from `stage === 'album'`, or a
  builder-level default). Defer unless wanted now.

### Files
| File | Change |
|---|---|
| `api/src/modules/trips/dto/create-trip.dto.ts` | Add `backdated?: boolean`. |
| `api/src/modules/trips/trips.service.ts` | `if (!dto.backdated) assertNotPast(...)`. |
| `packages/db/src/types` + `queries/trips.ts` | Thread `backdated` through `InsertTrip` / `createTrip` body. |
| `trailr/app/new-trip.tsx` | Mode toggle; switch picker bound (`minDate` vs `maxDate`); set `status`/`stage`/`backdated`; adapt copy + post-create routing. |
| `trailr/src/components/DateRangePicker.tsx` | (from Feature 1) min/max already added. |
| *(v2 only)* `api/src/modules/stops/*` | Default new stops to `visited` for album/backdated trips. |

---

## Edge cases

- **Log mode + future date:** blocked client-side by `maxDate = today`; optionally also
  enforce server-side for backdated trips (`end_date ≤ today`) so the API is honest on its
  own. Recommend a light server check too (Open Q2).
- **Plan mode near midnight (TZ):** the server check is UTC-date lenient already; the client
  `minDate = today` uses the device's local today, which for Bangkok (UTC+7) is ≥ the
  server's UTC today, so the two never disagree in a way that rejects a valid pick.
- **60-day cap:** still applies to both modes (a logged trip over 60 days hits the same 400).
  Fine, or relax for backdated (Open Q4).
- **Inverted range:** unchanged — still rejected in both modes.
- **Fork / update:** untouched. Forking a past trip already works (no past-check on fork).

---

## Open questions / decisions

1. **Logged-trip stage:** create as `stage: 'album'` (opens the polished album, but it's
   empty until they add stops) or `stage: 'planning'` (opens the builder to fill it in, then
   they publish to album)? Recommend **`planning`** so there's a place to add stops, then it
   becomes an album on publish. (If `album`, we'd need the album screen to handle an empty
   state + an "edit" path.)
2. **Server-side not-future check for backdated trips?** Add `end_date ≤ today` when
   `backdated`, or trust the client `maxDate`? Recommend a light server check for honesty.
3. **Persist `backdated`?** Add a column, or keep it a transient create-only flag? Needed
   only if v2 (visited-by-default stops) derives from it rather than from `stage`.
   Recommend **don't persist** for v1; derive v2 behaviour from `stage === 'album'` later.
4. **60-day cap for logged trips:** keep at 60 or allow longer for past trips (long journeys)?
5. **Visited-by-default stops (v2):** do it now or defer? Recommend **defer**.
