# Fix Plan — Booking System

> Implementation-ready fixes from the review in `DESIGN_bookings_refactor.md`.
> Execute **in order**: C1 → C2 → M1 → H1 → H2 → M2 → M3 → L1.
> Each fix lists the files, the change, and how to verify. Do one PR per fix.

---

## C1 — Regenerate Prisma client, drop `as any` casts

**Why:** `InventoryItem` is in `schema.prisma` but not in the generated client, so
`(this.prisma as any).inventoryItem` crashes at runtime.

**Steps:**
1. ```bash
   cd api && npx prisma generate
   ```
2. In `api/src/modules/ingestion/ingestion.service.ts`, replace every
   `(this.prisma as any).inventoryItem` and `(tx as any).inventoryItem` with
   `this.prisma.inventoryItem` / `tx.inventoryItem`.
3. Type the `parsed`/`item` reads off the real model instead of `as any`.

**Verify:**
- `cd api && npx tsc --noEmit` → 0 errors with the casts removed.
- Start API, `POST /api/v1/ingest/email` with a sample body → returns 202 and a row
  is created (no "Cannot read properties of undefined").

---

## C2 — Squash the two `_inventory_items` migrations

**Why:** `20260620110838_inventory_items` (sorts first) ALTERs a table that
`20260620170000_inventory_items` (sorts second) creates → fails on a fresh DB.

**Steps (preferred — regenerate against a clean DB):**
1. Delete both folders:
   - `api/prisma/migrations/20260620110838_inventory_items/`
   - `api/prisma/migrations/20260620170000_inventory_items/`
2. Spin up a clean shadow DB (or reset local), then:
   ```bash
   cd api && npx prisma migrate dev --name inventory_items
   ```
   This emits one migration with the `CREATE TABLE inventory_items` plus any
   legitimate drift (the `trip_messages` / `album_overrides` default tweaks) in the
   correct order.

**Steps (alternative — hand-merge, no DB reset):**
1. Delete `20260620110838_inventory_items/`.
2. In `20260620170000_inventory_items/migration.sql`, append the still-needed drift
   statements **after** the CREATE TABLE:
   ```sql
   ALTER TABLE "trip_messages"   ALTER COLUMN "id" DROP DEFAULT;
   ALTER TABLE "album_overrides" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
   ```
   (Drop the `inventory_items DROP DEFAULT` line — the CREATE already sets the right
   default.)
3. Reconcile the `_prisma_migrations` history if your local DB already applied the old
   pair (mark the removed one rolled back, or reset local).

**Verify:**
- Drop a scratch DB → `npx prisma migrate deploy` runs all migrations top-to-bottom
  with no error.
- `npx prisma migrate status` → "Database schema is up to date".

---

## M1 — `toInventoryRow` mapper + typed returns (do after C1)

**Why:** service/controllers return `Promise<any>` and leak `raw_payload` (full email
body + HTML) to the frontend. Every other module maps to a typed row.

**Steps:**
1. Add a mapper in `ingestion.service.ts` (mirrors `toBookingRow`):
   ```ts
   import type { InventoryItemRow } from '@trailr/shared'; // add type there if missing
   function toInventoryRow(i: InventoryItem): InventoryItemRow {
     return {
       id: i.id,
       user_id: i.user_id,
       source: i.source,
       type: i.type as BookingType,
       parsed: i.parsed as Record<string, unknown>,
       status: i.status as InventoryStatus,
       matched_stop_id: i.matched_stop_id,
       received_at: i.received_at.toISOString(),
     }; // note: raw_payload intentionally omitted
   }
   ```
2. Change `list` / `match` / `dismiss` / `ingestEmail` return types from `any` to
   `InventoryItemRow` (or `InventoryItemRow[]`) and run results through `toInventoryRow`.
3. Update `InventoryController` + `IngestionController` signatures to match.
4. Ensure `InventoryItemRow` (and `InventoryStatus`) live in `packages/shared` and are
   re-exported by `packages/db` (the db copy already exists in `types/database.ts` —
   keep the two in sync, shared is the contract source).

**Verify:**
- `GET /api/v1/inventory` response contains no `raw_payload` field.
- `npm run build -w @trailr/shared` then API + db typecheck clean.

---

## H1 — Per-user forwarding token

**Why:** `findRecipient` matches by a username substring and ignores the token, so
inventory items can be spoofed into any account; usernames with `-` also break.

**Steps:**
1. Schema — add to `User` in `schema.prisma`:
   ```prisma
   forwarding_token String? @unique
   ```
   (nullable first to backfill, then make required in a follow-up.)
2. Migration: `npx prisma migrate dev --name user_forwarding_token`.
3. Generate a token on signup (`auth.service` / user creation): a random 12-char
   url-safe string (e.g. `randomBytes(9).toString('base64url')`). Backfill existing
   users in the migration or a one-off script.
4. Rewrite `findRecipient` to extract the **token** from the local-part and look up by
   it, not by username:
   ```ts
   // address shape: {username}-{token}@in.trailr.app
   const local = dto.to?.match(/<?([^@<>\s]+)@/)?.[1];
   const token = local?.split('-').pop();
   if (!token) throw new BadRequestException('could not identify recipient');
   const user = await this.prisma.user.findFirst({ where: { forwarding_token: token } });
   if (!user) throw new NotFoundException('recipient not found');
   ```
5. Surface the address to the user (forwarding box in `trailr/app/inventory.tsx` and/or
   profile): `{username}-{forwarding_token}@in.trailr.app`.

**Verify:**
- Forwarding to a valid `username-token@…` creates an item for that user.
- Forwarding to `username-wrongtoken@…` → 404, no item created.

---

## H2 — Fail-closed webhook in production

**Why:** `assertSignature` returns early (allows) when the secret is unset; the
endpoint is `@Public()`.

**Steps:** in `assertSignature`, when `INBOUND_EMAIL_SIGNING_SECRET` is missing:
```ts
if (!secret) {
  if (this.config.get('NODE_ENV') === 'production') {
    throw new ForbiddenException('inbound signing secret not configured');
  }
  return; // dev only
}
```

**Verify:** with `NODE_ENV=production` and no secret, `/ingest/email` returns 403.

---

## M2 — Don't persist expiring offer/rate IDs as bookings

**Why:** when `external_ref` is set but no passenger/guest details, the providers
return `{ status: 'pending', external_ref: offerId }`. Duffel offer IDs (and LiteAPI
rate IDs) expire ~20 min, so the stored ref is unbookable.

**Decision (pick one) in `bookings.service.create`:**
- **A (recommended):** require passenger/guest details to actually book. If absent and
  `external_ref` is a live offer, create the itinerary stop but write the booking row
  with `external_ref: null` and `status: 'pending'` so it's clearly "saved, not booked".
- **B:** keep the offer id but add `offer_expires_at` and surface "offer expired" in UI.

Implement A unless the modal already collects details.

**Verify:** booking without details produces a stop + a booking row with
`external_ref: null, status: 'pending'`; booking with details hits the provider and
stores the real order/booking id with `status: 'confirmed'`.

---

## M3 — Extract price in JSON-LD parser

**Why:** `parseJsonLd` never reads price, so ingested stops have `cost: null`.

**Steps:** in `jsonld.parser.ts`, read price from the schema.org fields and convert:
```ts
const rate = Number(this.config.get('BOOKING_USD_THB_RATE') ?? 36); // pass rate in
const price = Number(data.totalPrice ?? data.reservationFor?.totalPrice ?? 0);
const currency = data.priceCurrency ?? 'USD';
amount_thb: price ? Math.round(currency === 'THB' ? price : price * rate) : undefined,
```
(`parseJsonLd` is a pure function today — pass the rate in as an arg from
`ingestion.service`, don't import ConfigService into the parser.)

**Verify:** forwarding a confirmation with JSON-LD price → item `parsed.amount_thb`
set → matched stop has non-null `cost`.

---

## L1 — Remove stray log files

**Steps:**
1. Delete: `api/api-err.txt`, `api/api-out.txt`, `trailr-expo.err`, `trailr-expo.out`.
2. Add to root `.gitignore`:
   ```
   *.out
   *.err
   api/api-*.txt
   ```

**Verify:** `git status` no longer lists them.

---

## Done criteria
- API + `@trailr/db` + `@trailr/shared` typecheck clean with **no `as any`** in ingestion.
- Fresh DB: `prisma migrate deploy` applies all migrations with no error.
- `/inventory` response carries no raw email body.
- Spoofed/wrong-token forward is rejected.
- End-to-end: forward sample flight + hotel emails → items appear → match to trip →
  assigned stops created with cost.
