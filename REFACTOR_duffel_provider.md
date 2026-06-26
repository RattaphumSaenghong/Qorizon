# Refactor — `duffel.provider.ts` dead-code cleanup

> **Status:** PLAN — not implemented. Spec for the implementer (Codex).
> **Scope:** `api/src/modules/bookings/providers/duffel.provider.ts` only.
> **Type:** Pure refactor — **no behavior change**. Same offer objects out.
> **Pairs with:** `DESIGN_flights_booking_redesign.md` §7 (which introduced
> `mapSlice` + `meta.slices`).

---

## 1. Why

The round-trip change extracted a `mapSlice()` helper and switched the offer
`meta` + `title` to read from a mapped `outbound` slice. But the **old inline
per-slice mapping block was left behind** in `searchFlights`. Its locals are now
unused except for the three the `subtitle` still references. Result: ~9 dead
bindings that duplicate what `mapSlice` already produces, defeating the point of
the helper.

This refactor deletes the dead block and sources the subtitle from `outbound`,
so slice mapping lives in exactly one place (`mapSlice`).

**Guardrails:** behavior must not change. The emitted `BookingOffer` (id, type,
provider, title, subtitle, amount_thb, and every `meta.*` field) must be
byte-identical for the same Duffel response. This is cleanup, not a feature.

---

## 2. Current state (the problem)

In `searchFlights`, inside `(offersData.data ?? []).map((offer) => { … })`:

- Lines ~136-144 — the **new** path: builds `mappedSlices` and `outbound`.
- Lines ~145-168 — the **old** path, still present:
  ```ts
  const slice = offer.slices?.[0];
  const segments = slice?.segments ?? [];
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const originCode = …;      // DEAD
  const destCode = …;        // DEAD
  const departingAt = firstSeg?.departing_at ?? null;  // used by subtitle only
  const arrivingAt = …;      // DEAD
  const carrier = …;         // DEAD
  const carrierName = …;     // DEAD
  const flightNumber = …;    // DEAD
  const stops = …;           // DEAD
  const itinerary = segments.map(…);  // DEAD
  ```
- Line ~182 `title` — already uses `outbound`. ✅
- Line ~183 `subtitle` — still uses `segments`, `slice`, `departingAt`,
  `departureDate`. ⛔ the reason the dead block can't simply be deleted yet.
- Lines ~190-201 `meta.*` — already use `outbound.*`. ✅
- Line ~202 `meta.slices: mappedSlices` — ✅

**Dead locals to remove:** `originCode`, `destCode`, `arrivingAt`, `carrier`,
`carrierName`, `flightNumber`, `stops`, `itinerary`, `lastSeg`, `firstSeg`,
`segments`, `slice` (the last three only after the subtitle is rewritten — §3).

`tsc` is green today only because `noUnusedLocals` is off; that's why this slips
through. See §6 for optionally turning it on.

---

## 3. Target state

### 3.1 Make `mapSlice` expose what the subtitle needs
The subtitle needs a stop count, a duration, and a fallback timestamp. `mapSlice`
already returns `stops`, `duration`, and `dep_at`/`departing_at`. So the subtitle
can be built entirely from `outbound` — no need to touch raw `offer.slices` again.

Add a small shared formatter near the top of the file (module scope, beside
`mapSlice`):

```ts
function stopLabel(stops: number): string {
  if (stops <= 0) return 'non-stop';
  return `${stops} stop${stops === 1 ? '' : 's'}`;
}
```

> Note: this also **fixes a latent bug** in the current subtitle, which prints
> `"2 stop"` (no plural). If you want a strictly zero-behavior-change refactor,
> keep the old non-pluralized string instead:
> `stops <= 0 ? 'non-stop' : `${stops} stop``. **Recommended: take the plural
> fix** — it's obviously correct and user-visible only as a nicer label. Call
> out which you chose in the commit message.

### 3.2 Rewrite the subtitle from `outbound`
Replace:
```ts
subtitle: `${offer.owner?.name ?? 'Duffel flight'} · ${segments.length <= 1 ? 'non-stop' : `${segments.length - 1} stop`} · ${slice?.duration ?? departingAt ?? departureDate}`,
```
with:
```ts
subtitle: `${offer.owner?.name ?? 'Duffel flight'} · ${stopLabel(outbound.stops)} · ${outbound.duration ?? outbound.dep_at ?? departureDate}`,
```

`outbound.stops` / `outbound.duration` / `outbound.dep_at` are the slice[0]
values — identical to what the old code read, since `outbound = mappedSlices[0]`
and `mappedSlices[0]` maps `offer.slices[0]`.

### 3.3 Delete the dead block
Remove the entire block from `const slice = offer.slices?.[0];` through the end of
`const itinerary = segments.map(…);` (lines ~145-168). Keep the explanatory
comment about the itinerary by moving a one-liner onto `mapSlice` instead (the
helper is now the single source of that logic).

### 3.4 Result shape of `searchFlights`'s `.map` callback (after)
```ts
return (offersData.data ?? []).map((offer) => {
  const mappedSlices = (offer.slices ?? []).map((slice, index) =>
    mapSlice(
      slice,
      index === 0 ? origin : destination,
      index === 0 ? destination : origin,
      offer.owner?.name ?? null,
    ),
  );
  const outbound = mappedSlices[0] ?? mapSlice(undefined, origin, destination, offer.owner?.name ?? null);

  const passengerIds = [
    ...(offer.passengers ?? []).map((x) => x.id).filter(Boolean),
    ...(offer.slices ?? []).flatMap((sl) =>
      (sl.segments ?? []).flatMap((s) => (s.passengers ?? []).map((x) => x.passenger_id).filter(Boolean)),
    ),
  ];
  const amount = Number(offer.total_amount ?? 0);
  const currency = offer.total_currency ?? 'USD';
  const amountThb = currency === 'THB' ? amount : amount * usdThb;

  return {
    id: offer.id,
    type: 'flight' as const,
    provider: 'duffel' as const,
    title: `${outbound.origin} -> ${outbound.destination}`,
    subtitle: `${offer.owner?.name ?? 'Duffel flight'} · ${stopLabel(outbound.stops)} · ${outbound.duration ?? outbound.dep_at ?? departureDate}`,
    amount_thb: Math.round(amountThb),
    meta: {
      offer_request_id: offerRequestId,
      total_amount: offer.total_amount,
      total_currency: currency,
      passenger_ids: Array.from(new Set(passengerIds)),
      origin: outbound.origin,
      destination: outbound.destination,
      dep_at: outbound.dep_at,
      arr_at: outbound.arr_at,
      carrier: outbound.carrier,
      carrier_name: outbound.carrier_name,
      flight_number: outbound.flight_number,
      stops: outbound.stops,
      duration: outbound.duration,
      departing_at: outbound.departing_at,
      arriving_at: outbound.arriving_at,
      segments: outbound.segments,
      slices: mappedSlices,
      raw: offer,
    },
  };
});
```

### 3.5 Fix the shadowed `slice` param
In the `passengerIds` flatMap, rename the inner `(slice) =>` param to `(sl) =>`
(done above) so it no longer shadows anything. Clears `no-shadow` and removes the
last reason to keep the outer `const slice`.

---

## 4. What must NOT change
- `mapSlice` itself — leave as-is (it's correct).
- `meta` keys and their values (all already sourced from `outbound`).
- `title`, `amount_thb`, currency conversion, `passenger_ids` set contents.
- The round-trip request-building (`slices` push for `return_date`) above the map.
- `bookFlight` — untouched.

The only intentional value change permitted is the **stop pluralization** in the
subtitle (§3.1), and only if you opt into it.

---

## 5. Acceptance checklist
- [ ] `mapSlice` is the only place that maps a Duffel slice → summary fields.
- [ ] No `originCode`/`destCode`/`carrier`/`carrierName`/`flightNumber`/`stops`/
      `itinerary`/`arrivingAt`/`firstSeg`/`lastSeg`/`segments`/`slice` locals
      remain in the `.map` callback.
- [ ] Subtitle built from `outbound.*`.
- [ ] No shadowed `slice` param.
- [ ] `npx tsc --noEmit` clean in `api/`.
- [ ] Manual diff of a one-way **and** a round-trip offer (before vs after) shows
      identical `meta`, `title`, `amount_thb` — only the subtitle stop label may
      differ if §3.1 plural fix was taken.

## 6. Optional follow-up (separate change)
Turn on `"noUnusedLocals": true` (and `noUnusedParameters`) in `api/tsconfig.json`
so dead bindings like this fail the build next time. Do this in its own commit
after the cleanup, since it may flag unused locals elsewhere in `api/`.
