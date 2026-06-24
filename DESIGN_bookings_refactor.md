# Booking System — Review & Refactor Plan

> Review of the Duffel + LiteAPI + email-ingestion implementation against
> `DESIGN_bookings.md`. Overall: **good**. Structure, provider split, env wiring,
> and types all match the plan and the API typechecks clean. The items below are
> fixes, ordered by severity.
>
> **STATUS (2026-06-21): all fixes below applied & verified.** See `FIX_bookings.md`
> for the implementation plan that was executed. Dev DB has `forwarding_token`
> (added via `db push` + backfill). This doc is kept as the review record.

---

## Critical — breaks on fresh setup / at runtime

### C1. Prisma client not regenerated → ingestion crashes at runtime
`InventoryItem` is in `schema.prisma` but **not in the generated client**
(`node_modules/.prisma/client`). That's why `ingestion.service.ts` uses
`(this.prisma as any).inventoryItem` everywhere — the cast hides a missing model.
The code compiles, but at runtime `this.prisma.inventoryItem` is `undefined`, so
**every `/ingest/email` and `/inventory` call throws** ("Cannot read properties of
undefined"). Ingestion is currently non-functional.

**Fix:**
1. `cd api && npx prisma generate`
2. Remove all `(this.prisma as any)` casts in `ingestion.service.ts` — once the
   client knows `inventoryItem`, the calls are properly typed.

### C2. Two `_inventory_items` migrations in the wrong order
- `20260620110838_inventory_items` (sorts **first**) does
  `ALTER TABLE "inventory_items" ... DROP DEFAULT` — on a table that doesn't exist yet.
- `20260620170000_inventory_items` (sorts **second**) is the `CREATE TABLE`.

On the dev's local DB this works (they were applied in creation order), but on a
**fresh DB / CI / new teammate** the `110838` ALTER runs before the `170000` CREATE
and the migration fails. This violates the plan's definition of done ("migrations
apply cleanly on a fresh DB"). Two identically-named migrations is also confusing.

**Fix (pick one):**
- **Preferred:** delete both, run `npx prisma migrate dev --name inventory_items`
  against a clean shadow DB to regenerate a single correct migration; or
- Manually merge: keep one migration that does CREATE TABLE first, then the
  `trip_messages` / `album_overrides` drift ALTERs after, and delete the other.
- Verify with: drop local DB → `npx prisma migrate deploy` → must succeed end-to-end.

---

## High — security / correctness

### H1. No per-user forwarding token (spoofing risk)
The plan called for a stored random token per user (`{username}-{token}@in.trailr.app`).
Instead `findRecipient` parses the username from the `to` address and **ignores the
token** (`username = match.split('-')[0]`). Consequences:
- Anyone who knows a username can inject inventory items into that account by
  forwarding to `username-anything@in.trailr.app` — the token provides no security.
- Usernames containing `-` break the `split('-')[0]` extraction.

The only thing standing in front of this is the HMAC check (H2), which is disabled
by default.

**Fix:** add `forwarding_token String @unique` to `User`, generate on signup, and
match recipients by token, not by a username substring.

### H2. Inbound webhook is open by default
`assertSignature` returns early (allows the request) when
`INBOUND_EMAIL_SIGNING_SECRET` is unset. Fine for local dev, but the endpoint is
`@Public()` and unauthenticated, so in any environment without the secret set it
accepts arbitrary `/ingest/email` POSTs. Acceptable for MVP local, but must be
**required in production** — flag with a `// DECISION NEEDED` and/or fail closed
when `NODE_ENV === 'production'`.

---

## Medium — quality / consistency

### M1. `any` return types + raw email leaked to the client
`ingestion.service.ts` and both controllers return `Promise<any>` / `any[]` and hand
back the **raw Prisma entity**, including `raw_payload` (full email subject, text,
**and HTML body**). The `/inventory` list endpoint ships that to the frontend.
Every other module maps to a typed shape (e.g. `toBookingRow`). 

**Fix:** add a `toInventoryRow(item): InventoryItemRow` mapper that drops
`raw_payload`, and type all service/controller methods with it. (`InventoryItemRow`
already exists in `packages/db/src/types/database.ts`.)

### M2. Deferred booking stores an unbookable ref
In `bookings.service.create`, when `external_ref` is present but no
passenger/guest details, the providers' `bookFlight`/`bookHotel` return
`{ status: 'pending', external_ref: offerId }`. Duffel **offer IDs expire in
~20 min** (LiteAPI rate IDs similarly), so a "pending" booking row stores a ref
that can never be completed. Either require details to actually book, or don't
persist the offer/rate id as `external_ref` on the deferred path.

### M3. JSON-LD parser never extracts price
`parseJsonLd` pulls type/route/ref/times but never reads price, so email-ingested
items always have `amount_thb` undefined and the created stop has `cost: null`.
Pull from `reservationFor.totalPrice` / `data.totalPrice` / `priceCurrency` when
present (convert non-THB via `BOOKING_USD_THB_RATE`, same as the providers).

---

## Low — hygiene

### L1. Stray log files committed to the tree
`api/api-err.txt`, `api/api-out.txt`, `trailr-expo.err`, `trailr-expo.out` are
untracked build/run logs. Delete them and add to `.gitignore`.

---

## What's good (keep as-is)
- Provider split into `FLIGHT_PROVIDER` / `HOTEL_PROVIDER` with mock fallback — clean,
  matches plan, factory branches on env keys.
- `parseHeuristic` regex layer between JSON-LD and the LLM — sensible cost saver,
  better than the 2-layer plan.
- LLM parser uses `claude-haiku-4-5-20251001` with strict-JSON prompt + try/catch
  fallback to null — correct model, safe failure.
- HMAC verification uses `timingSafeEqual` with length guard — done right.
- `env.ts` zod schema + `.env.example` updated; `BOOKING_USD_THB_RATE` shared
  between providers.
- Frontend `/inventory` screen, hooks, notification type + routing all wired.

---

## Fix order

| # | Fix | Effort | Blocks |
|---|---|---|---|
| C1 | `prisma generate` + drop `as any` | 5 min | ingestion runtime |
| C2 | squash the two migrations | 15 min | fresh-DB setup / CI |
| H1 | per-user `forwarding_token` | ~1 hr | + migration |
| H2 | fail-closed webhook in prod | 10 min | — |
| M1 | `toInventoryRow` mapper + typed returns | 30 min | depends on C1 |
| M2 | fix deferred-booking ref | 20 min | — |
| M3 | JSON-LD price extraction | 20 min | — |
| L1 | delete logs + gitignore | 2 min | — |

C1 and C2 are the must-fix pair before this runs anywhere but the author's machine.
Do C1 → C2 → M1 (M1 cleans up the casts C1 enables) → H1 → the rest.
