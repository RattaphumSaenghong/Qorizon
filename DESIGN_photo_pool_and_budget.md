# Design — Photo Pool & Budget "Your Share"

> Status: **design only, not implemented.** Two features for the shared-trip model
> ("shared plan, personal memory"). Written to be implemented top-to-bottom with no
> further design decisions. Pairs with `PROGRESS.md` and the block-scope feature already
> shipped (`stops.scope` + `stop_assignees`).

---

## ⚠️ Shared precondition (fix first — affects BOTH features)

`MembersService.list()` returns only `trip_members` rows. **The trip owner has no
`trip_members` row**, so the owner is absent from `useTripMembers`. This is already a
latent gap in the shipped block-scope feature (owner can't be picked in `WhoForControl`
/ `MemberSwitcher`), and it breaks the budget split denominator.

**Fix once, reuse everywhere:** introduce a single "everyone on this trip incl. owner"
list. Pick ONE:

- **(A, recommended) Backend** — add `GET /trips/:id/people` (or extend `list()`) that
  prepends the owner as a synthetic accepted member (`role: 'owner'`). One source of truth;
  `WhoForControl`, `MemberSwitcher`, and the budget split all consume it.
- **(B) Frontend** — in each screen, merge `trip.author` into the members array. Cheaper
  now, but duplicates the "+owner" logic in 3 places.

Everywhere below, **"members" means accepted members + owner** via this fixed list.

---

# Feature 1 — Photo Pool

## Intent
> "add the photo pool too and user can add private photo into album."

A **trip-level shared pool** of photos every member contributes to and can pull from into
their own album, **plus** the ability to add a **private** photo visible only in your own
album. Today media is already per-user (`media.user_id`) and the album assembles
`media WHERE user_id = target`, so "personal memory" exists — what's missing is (1) a
trip-level home for photos not yet pinned to a stop, (2) a shared/private visibility flag,
and (3) a way to pull another member's shared photo into your album.

> **Note:** this is also the app's **first media-upload UI** — none exists today (media is
> seed-only). Requires `expo-image-picker` (`npm install expo-image-picker --legacy-peer-deps`).

## Model decision
Keep `media` as the single media entity. Today `media.stop_id` is **NOT NULL** (every photo
must pin to a stop) and reaches its trip only via the stop. Relax that:

- `media.stop_id` → **nullable** (a pool photo can be unsorted, not yet on a stop).
- add `media.trip_id` (denormalized) so unsorted pool photos still have a trip home.
- add `media.visibility` (`'shared' | 'private'`, default `'shared'`).

Rejected alternative: a separate `trip_photos` table — more surface, and it would duplicate
the storage/album plumbing media already has.

## Visibility semantics
- `shared` → in the **pool** (visible to all trip people) **and** in the uploader's album.
  Other members may **pull** it into their own album.
- `private` → uploader's album + the uploader's own pool view only. **Never** surfaced to
  other members (enforce server-side in pool list AND album assembly).

## "Pull into my album" — reuse `album_overrides`, no new table
Album assembly already filters `media.user_id = target` and layers per-member overrides
(`order`, `excluded`, `captions`). Add a fourth list:

- `AlbumOverrides.included?: string[]` — media ids authored by *others* (shared pool only)
  that I've pulled into my album.

Album assembly becomes: `(media WHERE user_id = me) ∪ (media WHERE id IN overrides.included
AND visibility = 'shared')`, then apply `excluded` / `order` / `captions` as today.
Symmetric with `excluded`, zero schema cost beyond the existing JSON column.

## DB migration — `api/prisma/migrations/<ts>_media_pool/migration.sql`
```sql
ALTER TABLE "media" ADD COLUMN "trip_id" UUID;
ALTER TABLE "media" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'shared';
ALTER TABLE "media" ALTER COLUMN "stop_id" DROP NOT NULL;

-- backfill trip_id from the owning stop for existing rows
UPDATE "media" m SET "trip_id" = s."trip_id" FROM "stops" s WHERE m."stop_id" = s."id";

-- pool photos must have a trip home (enforce after backfill)
ALTER TABLE "media"
  ADD CONSTRAINT "media_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;

-- deleting a stop should return its photos to the unsorted pool, not destroy them
ALTER TABLE "media" DROP CONSTRAINT "media_stop_id_fkey";
ALTER TABLE "media"
  ADD CONSTRAINT "media_stop_id_fkey"
  FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE SET NULL;

CREATE INDEX "media_trip_id_visibility_idx" ON "media"("trip_id", "visibility");
```
Apply with `prisma migrate deploy` (API stopped first — Windows DLL lock). After deploy,
backfill `trip_id` is required to be non-null only for rows you keep; new uploads always set it.

> Reminder (gotcha file): `migrate dev` is non-interactive-hostile here — hand-write the SQL
> and `migrate deploy`, then `prisma generate` with the API stopped.

## Prisma schema (`schema.prisma`)
```prisma
model Media {
  // ...
  stop_id     String?  @db.Uuid          // was String — now nullable
  trip_id     String   @db.Uuid          // NEW
  visibility  String   @default("shared") // NEW: 'shared' | 'private'
  // ...
  stop Stop? @relation(fields: [stop_id], references: [id], onDelete: SetNull) // was Stop
  trip Trip  @relation(fields: [trip_id], references: [id], onDelete: Cascade) // NEW
}

model Trip {
  // ...
  media Media[]   // NEW back-relation
}
```

## Shared types (`packages/shared/src/`) — rebuild after (`npm run build -w @trailr/shared`)
- `enums.ts`: `export type MediaVisibility = 'shared' | 'private';`
- `stops.ts` `MediaRow`: `stop_id: string | null;` · add `trip_id: string;` · add `visibility: MediaVisibility;`
- `albums.ts` `AlbumOverrides`: add `included?: string[];`
- Mirror all of the above in **`packages/db/src/types/database.ts`** (the db client keeps its
  own copy — do not import shared there; see gotchas).

## API
Gate note: existing `MediaService.upload` uses `assertOwnsTrip` — **change to
`assertCanEditTrip`** (owner or accepted member) so members can add their own media.

- `POST /trips/:id/media` — upload to the pool. Body: existing `UploadMediaDto` +
  `visibility?` + optional `stop_id?`. `trip_id` from the path, `user_id` from the token.
  Gate `assertCanEditTrip`. (Keep `POST /stops/:id/media` as a thin alias that sets
  `trip_id` from the stop.)
- `GET /trips/:id/pool?member=&visibility=` — pool list. Returns `media WHERE trip_id = :id
  AND (visibility = 'shared' OR user_id = viewer)`. Gate `assertCanReadTrip`. Never leak
  another member's `private`.
- `PATCH /media/:id` — uploader only. Settable: `visibility`, `stop_id` (pin/unpin to a
  stop), `sort_order`, `caption`-ish. (Today only delete exists.)
- `AlbumsService.getAlbum` — union in `overrides.included` (shared-only) as above;
  `AlbumsService.updateOverrides` — accept `included` (full-replace list, same shape as
  `excluded`). `UpdateAlbumDto` gains `included?: string[]`.

## Frontend
New surface — a **Pool** section, best placed on the album screen (`trailr/app/album/[id].tsx`)
and reachable from the journal:
- Grid of the trip's shared pool photos + your private ones; `+ Add photos` button →
  `expo-image-picker` → base64 → `POST /trips/:id/media`.
- Per photo (your own): `Private` toggle (`PATCH visibility`), `Pin to stop` (`PATCH stop_id`),
  delete.
- Per photo (anyone's shared): `★ In my album` toggle → writes `overrides.included` /
  `excluded` via the existing album-edit mutation.
- New db-client fns + hooks: `uploadTripMedia`, `fetchPool`, `updateMedia` in
  `packages/db/src/queries/media.ts` (+ `useMedia.ts` hook); invalidate `['pool', tripId]`
  and `['album', tripId, member]`.

## Implementation checklist
1. Fix the owner-in-members precondition (above).
2. `npm install expo-image-picker --legacy-peer-deps` (in `trailr/`).
3. Migration + `prisma generate` (API stopped) + schema edits.
4. Shared types + db-client types; rebuild shared.
5. API: upload gate change, `POST /trips/:id/media`, `GET /trips/:id/pool`, `PATCH /media/:id`,
   album `included` union + DTO.
6. db-client queries/hooks.
7. Album Pool UI + image picker.
8. Verify: member A uploads shared → appears in B's pool → B pulls into album → A's private
   never shows for B.

## Out of scope v1 (flag, don't build)
Albums/face grouping, video transcoding, EXIF GPS extraction (media GPS still optional —
album falls back to stop coords), bulk pull-all.

---

# Feature 2 — Budget "Your Share"

## Intent
On a group trip, show each person **what they owe**, not just the trip total. Reuses the
block-scope assignment we already shipped (`stop.scope`, `stop.assignees`).

## Split rule (the whole design)
Per stop with a `cost`:
- `scope = 'shared'` → split **equally among all trip people** (accepted members + owner).
  Your share `= cost / peopleCount`.
- `scope = 'assigned'` → split **equally among the assignees only**. Your share
  `= cost / assignees.length` if you're an assignee, else `0`.

Clean and predictable; no custom weights in v1.

## No schema change — pure derived (v1)
The builder already loads every stop (`scope`, `assignees`, `cost`) and, once the owner-list
precondition is fixed, the full people list. The math is a pure function — **no migration**.

```ts
// trailr/src/lib/budget.ts  (new, ~30 lines)
export interface ShareResult {
  total: number;
  perMember: Map<string, number>; // userId -> their share
}
export function computeShares(
  stops: { cost: number | null; scope: 'shared' | 'assigned'; assignees: { id: string }[] }[],
  people: { id: string }[],          // accepted members + owner
): ShareResult {
  const peopleCount = people.length || 1;
  const perMember = new Map(people.map((p) => [p.id, 0]));
  let total = 0;
  for (const s of stops) {
    const cost = s.cost ?? 0;
    if (!cost) continue;
    total += cost;
    const split = s.scope === 'assigned' && s.assignees.length > 0
      ? s.assignees.map((a) => a.id)
      : people.map((p) => p.id);
    const each = cost / split.length;
    for (const id of split) perMember.set(id, (perMember.get(id) ?? 0) + each);
  }
  return { total, perMember };
}
```

## UI (`trailr/app/builder/[id].tsx`)
- Toolbar budget chip: when `people.length >= 2`, show both —
  `Total ฿{spent} · You ฿{round(perMember.get(userId))}`. Solo trips unchanged.
- When the `MemberSwitcher` filter selects a member, show **that** member's share
  (the filter state already exists: `filterMemberId`).
- Budget modal: add a per-person breakdown list (`people.map` → name + their share),
  so the group can see who owes what.
- Round shares for display (`Math.round`); keep cents internally if you later reconcile.

## Implementation checklist
1. Owner-in-people precondition (shared).
2. Add `trailr/src/lib/budget.ts` (`computeShares`).
3. Builder: compute `{ total, perMember }`, swap the toolbar chip + modal breakdown.
4. Verify: 3 people, one shared 3000 stop + one assigned-to-A 1000 stop → A owes 2000,
   B & C owe 1000 each, total 4000.

## Out of scope v1 (flag, don't build — these DO need schema)
- **Custom split weights / unequal shares** → `stop_assignees.share_pct` (or amount) column;
  change `computeShares` to honor it.
- **Real settled money / "who paid"** (vs estimated `cost`) → fold `bookings.amount_thb`
  (Decimal) in, or a `trip_expenses` table with `paid_by` + settlements. Big feature; keep
  v1 to estimates only.
- **Multi-currency** — single `trip.budget_currency` assumed throughout.
