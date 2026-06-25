# Design — Per-Booking Detail Screen

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Date:** 2026-06-25
> **Pairs with:** `DESIGN_book_tab.md` (the Saved→Booked list that links here),
> `DESIGN_bookings.md` / `DESIGN_bookings_refactor.md` (the booking model & book flow),
> `DESIGN_explore_stays.md` (where hotel `meta` originates).
> **Implements:** `NEXT.md` item 2.

---

## 1. What & why

The **Saved → Booked** list (`app/(tabs)/saved.tsx`) renders every booking the user has made,
but each `BookingCard` is **display-only** — tapping it does nothing. There is no screen that
shows a single booking on its own.

> **Why it was left this way.** `DESIGN_book_tab.md` §6 told the implementer to tap-through to
> `router.push('/booking/' + id)`, claiming `app/booking/[id].tsx` is the detail screen. That is
> **wrong**: `app/booking/[id].tsx` is the *trip-scoped booking flow* — `[id]` is a **trip id**,
> and it renders live flight/hotel **offers to book** for that trip (see
> [`app/booking/[id].tsx:62-71`](trailr/app/booking/[id].tsx)). Pointing a booking card there
> would load a broken "book offers for trip `<booking-id>`" screen. The implementer correctly
> caught this and left the card inert with a comment
> ([`saved.tsx:57`](trailr/app/(tabs)/saved.tsx)).

**This doc** specifies the real per-booking detail view: a new route, a new read endpoint, a
new hook, and re-enabling the card tap.

### Success criteria
- Tapping a Booked card opens a detail screen for **that booking**.
- The screen shows everything we know: title, type, status, amount, provider, dates/address for
  hotels, confirmation ref, trip link, booked-on date — and a map pin when coords exist.
- A `pending` booking can be **Confirmed** or **Cancelled** from the screen; a `confirmed` one can
  be **Cancelled**; a `cancelled` one is read-only. List + detail stay in sync after a mutation.
- No regression to the existing trip-scoped `app/booking/[id].tsx` flow.

---

## 2. The core problem: `BookingRow` is too thin for a detail screen

`list()` maps each DB row through `toBookingRow()`
([`bookings.service.ts:154-169`](api/src/modules/bookings/bookings.service.ts)), which surfaces
only `title` from `raw_payload` and **drops `meta` entirely**. That's fine for a list card, but a
*detail* screen wants the richer data that the Explore/Stays booking already persisted into
`raw_payload.meta` (see [`stays.tsx:166-172`](trailr/app/book/stays.tsx) — it writes
`hotel_id`, `latitude`, `longitude`, plus the spread offer `meta` which includes `nights`,
`address`, rate ids, etc.).

```
Booking.raw_payload  =  { title, meta, confirmation }
                                  └─ hotel: { hotel_id, latitude, longitude, nights,
                                              address?, check_in?, check_out?, … }
                                  └─ flight: { airline?, route?, … }   (provider-dependent)
```

### Decision: add a richer `BookingDetailRow`, returned **only** by `GET /bookings/:id`
Keep `list()` returning the thin `BookingRow` (lists stay cheap). The single-booking endpoint
returns a superset that includes `meta` and the persisted `confirmation`. This avoids bloating
every list payload while giving the detail screen what it needs.

```ts
// packages/shared/src/bookings.ts  (NEW, additive)
export interface BookingDetailRow extends BookingRow {
  stop_id: string | null;
  meta: Record<string, unknown> | null;          // raw_payload.meta
  confirmation: Record<string, unknown> | null;  // raw_payload.confirmation
}
```

> **Alternative considered (rejected for v1):** widen `BookingRow` itself to carry `meta`. Rejected
> because the list endpoint would then ship per-booking blobs for every card, and nothing in the
> list view reads them. Additive `BookingDetailRow` is the surgical choice.

---

## 3. Backend — `GET /bookings/:id`

### 3.1 Controller — `bookings.controller.ts`
Add a single ownership-scoped read route.

```ts
@Get(':id')
getOne(@CurrentUser() userId: string, @Param('id') id: string): Promise<BookingDetailRow> {
  return this.bookings.getOne(userId, id);
}
```

**Route-ordering caveat.** `@Get(':id')` is a greedy param route. Verify it does **not** shadow any
literal GET sub-route. Current GETs on this controller: only `@Get()` (the list). `confirm`/`cancel`
are `@Post(':id/confirm' | ':id/cancel')`, so there is **no collision** — but if a future
`@Get('something')` is added it must be declared **above** `@Get(':id')`. Note this in the code with
a short comment so it isn't reintroduced as a bug.

### 3.2 Service — `bookings.service.ts`
```ts
async getOne(userId: string, id: string): Promise<BookingDetailRow> {
  const b = await this.prisma.booking.findFirst({ where: { id, user_id: userId } });
  if (!b) throw new NotFoundException('booking not found');
  return toBookingDetailRow(b);
}
```

- **Ownership is enforced in the `where`** (`user_id: userId`) — same pattern as `setStatus()`
  ([`bookings.service.ts:143-151`](api/src/modules/bookings/bookings.service.ts)). A booking owned
  by another user returns 404 (not 403) — don't leak existence.
- Add a `toBookingDetailRow(b)` next to `toBookingRow` that reuses it and appends the extra fields:

```ts
function toBookingDetailRow(b: Booking): BookingDetailRow {
  const raw = (b.raw_payload as {
    title?: string | null;
    meta?: Record<string, unknown> | null;
    confirmation?: Record<string, unknown> | null;
  } | null) ?? {};
  return {
    ...toBookingRow(b),
    stop_id: b.stop_id,
    meta: raw.meta ?? null,
    confirmation: raw.confirmation ?? null,
  };
}
```

### 3.3 Build & restart (per `[[trailr-api-run-mode]]`)
`@trailr/shared` enum/type changes must be rebuilt before the API picks them up:
1. `npm run build` in `packages/shared` (new `BookingDetailRow` export).
2. `npm run build` in `api/`.
3. Restart `node --enable-source-maps dist/src/main.js` from `api/`.

---

## 4. Data layer — `@trailr/db`

### 4.1 Query — `packages/db/src/queries/bookings.ts`
```ts
/** A single booking with its meta/confirmation (detail screen). */
export async function fetchBooking(id: string): Promise<BookingDetailRow> {
  return request<BookingDetailRow>('GET', `/bookings/${id}`);
}
```
Re-export `BookingDetailRow` through `@trailr/db`'s `types` barrel so the screen can import it.

### 4.2 Hook + query key — `packages/db/src/hooks/useBookings.ts`
```ts
export const bookingKeys = {
  list: (tripId?: string) => ['bookings', tripId ?? 'all'] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,   // NEW
  search: (params: SearchBookingRequest) => ['bookings', 'search', params] as const,
};

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBooking(id),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}
```

### 4.3 ⚠ Invalidation gap — Confirm/Cancel must refresh the detail too
`useConfirmBooking` / `useCancelBooking` currently invalidate **only** `bookingKeys.list(tripId)`
([`useBookings.ts:47-61`](packages/db/src/hooks/useBookings.ts)). From the detail screen, the
mutation must also refresh `bookingKeys.detail(id)` or the screen will show a stale status until
remount.

**Decision:** make both mutation hooks invalidate the detail key as well. Both `confirm`/`cancel`
return the updated `BookingRow`, so the cleanest path is to **write the result straight into both
caches** and invalidate the list:

```ts
export function useConfirmBooking(tripId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: bookingKeys.list(tripId) });
      qc.invalidateQueries({ queryKey: bookingKeys.detail(row.id) });
    },
  });
}
// same shape for useCancelBooking
```
> Note `confirm`/`cancel` return `BookingRow` (thin), not `BookingDetailRow`. Prefer
> `invalidateQueries` on the detail key (triggers a refetch that returns the full detail) over
> `setQueryData` (which would overwrite the detail cache with a thin row missing `meta`).

---

## 5. Frontend route — `app/booking/view/[id].tsx`

### 5.1 Why nested under `view/`
`app/booking/[id].tsx` already exists (trip-scoped flow). Adding the detail screen as
`app/booking/view/[id].tsx` keeps them unambiguous in Expo Router:

| Path | File | Meaning |
|---|---|---|
| `/booking/<tripId>` | `app/booking/[id].tsx` | trip-scoped book-offers flow (existing) |
| `/booking/view/<bookingId>` | `app/booking/view/[id].tsx` | **new** per-booking detail |

`view` is a **static segment**, so `/booking/view/123` resolves to the new screen and never
collides with the `[id]` param route (different segment depth; static beats dynamic). Register the
new screen in [`app/_layout.tsx`](trailr/app/_layout.tsx) as a `Stack.Screen`
(`name="booking/view/[id]"`), mirroring how `booking/[id]` is registered.

> **Naming note:** the route param is still called `id` inside `view/[id].tsx`, but here it is a
> **booking id**. Keep a one-line comment to prevent the same trip-id/booking-id confusion that
> caused the original mis-link.

### 5.2 Screen behaviour
- `const { id } = useLocalSearchParams<{ id: string }>();`
- `const { data: booking, isLoading, isError } = useBooking(id);`
- States: **loading** (spinner), **error/404** (`"Booking not found"` + back), **loaded**.
- Header: `Wordmark` + `‹ back` (`router.back()`) — match `app/booking/[id].tsx:163-172`.

### 5.3 Content (loaded)
A single scrollable column (reuse `colors/spacing/fontSize/radius` from `theme/tokens`):

1. **Hero / title block** — `type` badge (`✈ Flight` / `🛏 Stay`), `booking.title`, and a
   prominent `status` chip (accent when `confirmed`, muted when `cancelled`).
2. **Price** — `amount_thb` as `฿{n.toLocaleString()}`. For hotels with `meta.nights`, also show
   per-night (`Math.round(amount_thb / nights)`), reusing the `nightly()` logic already in
   [`HotelDetailSheet.tsx:25-29`](trailr/src/components/HotelDetailSheet.tsx) — lift it into a
   tiny shared helper rather than duplicating a third time.
3. **Details rows** (label/value list, render only what's present):
   - Hotel: `meta.address`, `meta.check_in` → `meta.check_out`, `meta.nights` nights.
   - Flight: `meta.route` / `meta.airline` / segment info (provider-dependent — guard each).
   - Common: provider (`via liteapi` / `via duffel`), confirmation ref (`external_ref`),
     booked-on (`new Date(created_at).toLocaleDateString()`).
4. **Map** (hotels only) — if `meta.latitude` & `meta.longitude` are numbers, render a small
   `MapView` with one `planned` pin (same `posts` shape as `stays.tsx:211-222`). Skip entirely
   for flights / missing coords.
5. **Trip link** — if `booking.trip_id`, a row "Part of a trip →" that
   `router.push('/journal/' + trip_id)` (mirror `saved.tsx:95-98`).
6. **Actions** (bottom):
   | Current status | Buttons |
   |---|---|
   | `pending` | **Confirm** (solid) · **Cancel** (outline) |
   | `confirmed` | **Cancel** (outline) |
   | `cancelled` | none — read-only |
   - `Confirm` → `useConfirmBooking().mutate(id)`; `Cancel` → `useCancelBooking().mutate(id)`.
   - Cancel should confirm first (web: `window.confirm`, native: `Alert.alert`) — match the
     `Alert` pattern in `app/booking/[id].tsx`.
   - Disable buttons while `isPending`.

---

## 6. Re-enable the card tap — `app/(tabs)/saved.tsx`

- Change `BookingCard`'s root from `View` → `TouchableOpacity`
  ([`saved.tsx:59-77`](trailr/app/(tabs)/saved.tsx)); add an `onOpen` prop.
- In the list, pass `onOpen={() => router.push('/booking/view/' + booking.id)}`
  ([`saved.tsx:159-165`](trailr/app/(tabs)/saved.tsx)).
- Delete the now-stale "Display-only for now…" comment at `saved.tsx:57-58`.
- Keep cancelled cards tappable (the detail screen is the place to see *why* / its history), but
  retain the existing muted styling.

---

## 7. File-by-file

| File | Action |
|---|---|
| `packages/shared/src/bookings.ts` | **add** `BookingDetailRow` interface |
| `api/src/modules/bookings/bookings.controller.ts` | **add** `@Get(':id')` → `getOne` (mind route order) |
| `api/src/modules/bookings/bookings.service.ts` | **add** `getOne()` + `toBookingDetailRow()` |
| `packages/db/src/queries/bookings.ts` | **add** `fetchBooking(id)` |
| `packages/db/src/hooks/useBookings.ts` | **add** `useBooking`, `bookingKeys.detail`, fix confirm/cancel invalidation |
| `packages/db/src/types` (barrel) | re-export `BookingDetailRow` |
| `trailr/app/booking/view/[id].tsx` | **new** — detail screen |
| `trailr/app/_layout.tsx` | register `booking/view/[id]` Stack.Screen |
| `trailr/app/(tabs)/saved.tsx` | `BookingCard` → tappable; push to `/booking/view/:id`; drop stale comment |
| `trailr/src/components/HotelDetailSheet.tsx` | (optional) extract `nightly()` to a shared helper reused by the detail screen |

---

## 8. Open decisions / TODO
- [ ] **`meta` shape is provider-dependent and loosely typed** (`Record<string, unknown>`). The
      screen must guard every field. Worth a small `parseHotelMeta(meta)` / `parseFlightMeta(meta)`
      that returns a typed, all-optional view — keeps the JSX clean. Decide whether that lives in
      the screen or `@trailr/db`.
- [ ] **Flight detail richness** — mock/Duffel store different `meta`. v1: show whatever exists
      generically (route, provider, ref); defer airline-segment formatting until real Duffel is
      live (`NEXT.md` item 3).
- [ ] **Delete vs Cancel** — there is no hard-delete endpoint, only status→`cancelled`. v1 keeps
      cancel-only; a destructive delete is out of scope.
- [ ] **Confirm semantics** — `confirm` here just flips DB status; it does **not** call the
      provider. Fine until payments (`NEXT.md` item 4 / MoR) lands; revisit then.
- [ ] **Email-ingested bookings** (`provider: 'email'`) may have sparse `meta` — ensure the detail
      screen degrades gracefully (title + amount + status only).

---

## 9. Phases (each independently verifiable)
1. **Backend** — `BookingDetailRow` + `GET /bookings/:id`. Verify with `curl`
   (`GET /api/v1/bookings/<id>` with a bearer token → 200 with `meta`; another user's id → 404).
2. **Data layer** — `fetchBooking` + `useBooking` + invalidation fix. Verify types compile
   (`npx tsc --noEmit` in `trailr/`).
3. **Detail screen** — `app/booking/view/[id].tsx` rendering all blocks + actions.
4. **Wire the tap** — `saved.tsx` card → push. Verify end-to-end in the browser preview:
   Saved → Booked → tap a card → detail loads → Confirm/Cancel updates status and reflects back
   in the list.

---

## 10. Verification script (phase 1, copy-paste)
```bash
# from repo root, API running on :3000
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"somchai@trailr.app","password":"password123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# grab the newest booking id from the list, then fetch its detail
ID=$(curl -s http://localhost:3000/api/v1/bookings -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
curl -s http://localhost:3000/api/v1/bookings/$ID -H "Authorization: Bearer $TOKEN" | python -m json.tool
# expect: 200 with meta + confirmation fields present
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:3000/api/v1/bookings/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN"   # expect: 404
```
