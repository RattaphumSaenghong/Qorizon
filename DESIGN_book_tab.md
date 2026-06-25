# Design — "Book" Tab + Saved "Booked" List

> **Status:** PLAN — not implemented. Spec for the implementer.
> **Pairs with:** `DESIGN_explore_stays.md` (the Stays map this tab adopts),
> `DESIGN_bookings.md` (the Duffel/LiteAPI book flow), `DESIGN_hotel_recs.md`.

---

## 1. What & why

Two changes:

1. **New 5th top-level tab `Book`** — a landing with **two cards → two sub-pages**:
   **Flights** and **Stays**. It's the standalone browse-and-book surface (distinct from
   the trip-scoped "Suggest stays" sheet in the builder, which stays as-is).
2. **`Saved` tab gains a `Booked` list** — everything the user has booked (flights + hotels)
   surfaces there. Data already exists (`useBookings`); nothing is "moved" in storage — Saved
   just reads and displays it.

---

## 2. Navigation

Tabs become: **Feed · Explore · Trips · Saved · Book**.

- **`TopBar.tsx`** — add `'Book'` to the default `tabs` array
  (`['Feed','Explore','Trips','Saved','Book']`).
- **Per-screen `onTabPress`** — every tab screen maps tab→route in its own handler
  (e.g. `explore.tsx:148`). Add a `Book` case → `router.push('/(tabs)/book')` in each
  (`index`, `explore`, `trips`, `saved`, `book`).

### Routes
| Path | File | Note |
|---|---|---|
| `/(tabs)/book` | `app/(tabs)/book.tsx` | **new** — landing (two cards) |
| `/book/stays` | `app/book/stays.tsx` | **move** from `app/explore-stays.tsx` |
| `/book/flights` | `app/book/flights.tsx` | **new** — flight search |

Register `book/stays` + `book/flights` as `Stack.Screen`s in `app/_layout.tsx`
(replace the existing `explore-stays` entry).

---

## 3. Book landing — `app/(tabs)/book.tsx`
- `TopBar active="Book"` + the tab nav handler (§2).
- Two large cards:
  - **✈ Flights** → `router.push('/book/flights')`
  - **🛏 Stays** → `router.push('/book/stays')`
- Pass through an optional `?tripId=` so a booking made here can attach to a trip
  (carry it into both sub-pages' query string).

---

## 4. Stays sub-page — `app/book/stays.tsx`
- **Move `app/explore-stays.tsx` here verbatim** (map + place search + "Search this area" +
  catalog/rates + `HotelDetailSheet`). Keep `?tripId` support.
- **Update the 3 callers** of the old route:
  - `app/(tabs)/explore.tsx:108` `'/explore-stays'` → `'/book/stays'` (or point at `/(tabs)/book`)
  - `app/builder/[id].tsx:902` `'/explore-stays?tripId=…'` → `'/book/stays?tripId=…'`
  - `app/_layout.tsx:16` `Stack.Screen name="explore-stays"` → the two new names

---

## 5. Flights sub-page — `app/book/flights.tsx` (NEW)
Non-trip flight search (mirror `BookingSearchModal`'s flight branch, but as a full screen):
- Inputs: **origin** (IATA), **destination** (IATA), **depart date** (reuse `DateField` +
  the `cityToIata` map already in `BookingSearchModal.tsx`).
- Search → `useOfferSearch({ type:'flight', origin, destination, depart_date }, submitted)`
  (the Duffel/mock provider's `searchFlights` runs without a trip).
- Render offer cards (airline · stops · duration · price) → **Book** via
  `useCreateBooking(tripId?)` with optional passenger details.
- Empty / loading / error states like the modal.

---

## 6. Saved "Booked" list — `app/(tabs)/saved.tsx`
- Add a segmented control at top: **Saved | Booked**.
- **Saved** = existing saved trips/stops (`useSaved`) — unchanged.
- **Booked** = `useBookings()` (no tripId → all of the user's bookings) → cards:
  - icon `✈ / 🛏` by `type`, `title`, `amount_thb` THB, `status` chip
    (`pending`/`confirmed`/`cancelled`), `created_at`.
  - tap → `router.push('/booking/' + id)` (`app/booking/[id].tsx` exists).
  - newest-first; simple flat list for v1; empty state when none.

---

## 7. Reuse — all data/hooks already exist
- `useBookings(tripId?)` — list (`useBookings.ts:27`)
- `useOfferSearch`, `useCreateBooking` — search + book
- `app/booking/[id].tsx` — detail
- `BookingSearchModal.tsx` — `cityToIata`, `DateField`, flight-card layout to lift from

---

## 8. File-by-file
| File | Action |
|---|---|
| `src/components/TopBar.tsx` | add `'Book'` tab |
| `app/(tabs)/book.tsx` | **new** — landing (two cards) |
| `app/book/stays.tsx` | **move** from `app/explore-stays.tsx` |
| `app/book/flights.tsx` | **new** — flight search |
| `app/(tabs)/saved.tsx` | Saved\|Booked segment + Booked list |
| `app/(tabs)/{index,explore,trips}.tsx` | add `Book` case to `onTabPress` |
| `app/_layout.tsx` | swap `explore-stays` Stack.Screen → `book/stays` + `book/flights` |
| `app/(tabs)/explore.tsx`, `app/builder/[id].tsx` | repoint `/explore-stays` links → `/book/stays` |

---

## 9. Open decisions / TODO
- [ ] Sub-page location: `app/book/*` (recommended, flat) vs nested under `(tabs)`.
- [ ] Trip context: Book is reachable both globally (no trip) and from the builder
      (`?tripId`) — keep both; booking attaches only when `tripId` is present.
- [ ] Booked list grouping: v1 flat newest-first; upcoming/past split is later.
- [ ] Show cancelled bookings in the list, or filter them? (default: show, greyed.)
- [ ] Landing card visuals — icons/imagery TBD; keep it simple first.

---

## 10. Phases
1. **Book tab + landing + nav** + move `explore-stays` → `book/stays` (repoint callers).
2. **Flights sub-page** (Duffel search as a full screen).
3. **Saved → Booked** segment.
