# Design — Global Search

> Status: **PLAN ONLY — not implemented. All 5 decisions RESOLVED (see §11) — ready to build.**
> Next feature after trip chat. Makes the decorative TopBar search box real.

---

## 1. Goal

The TopBar shows a dead pill: `⌕ Search places, trips, people` ([TopBar.tsx:67](trailr/src/components/TopBar.tsx)). Make it a working unified search across three domains:

- **People** — users by `username`, `display_name`, `real_name`.
- **Trips** — public trips by `title`, `destination`.
- **Places** — Mapbox place suggestions (reuse the builder's existing search).

Tapping a result navigates: person → `profile/[username]`, trip → opens by stage, place → (v1) explore recenter / drop-a-pin entry.

**Success criteria**
1. Typing ≥2 chars in the TopBar box opens a results overlay with grouped, debounced results.
2. People + trip results come from the API (real data); places from Mapbox.
3. Results are auth-correct: private/followers-only trips never leak to non-permitted viewers.
4. Each result navigates to the right screen.
5. Keyboard: Enter on the box opens a full results screen; Esc/back closes the overlay.

---

## 2. Scope

**In (v1)**
- Three domains, grouped results, debounce, navigation.
- Backend `ILIKE` search for people + public trips, capped + ranked.
- Reuse Mapbox `suggestPlaces` (extract to a shared lib).
- Overlay (quick results, top 3–5 per group) + a full `/search` screen (all results, paginated-ish).

**Out (deferred)**
- Full-text / fuzzy / typo tolerance (Postgres `pg_trgm` or a search engine) — v1 is `ILIKE '%q%'`.
- Search history / recent searches / suggestions-as-you-type beyond the live query.
- Searching stops/posts/captions, hashtags, "near me" geo ranking.
- Followers-graph ranking; v1 ranks by simple prefix-match + counts.
- Search analytics.

---

## 3. The three domains

### 3.1 People
- Match `username ILIKE %q%` OR `display_name ILIKE %q%` OR `real_name ILIKE %q%`.
- Return `AUTHOR_SELECT` shape + `follower_count`, and `is_following` for the viewer (so the row can show a Follow button later — optional in v1).
- Rank: exact/prefix username first, then by `follower_count desc`. Cap 20.
- **Privacy:** `real_name` is matched but only *returned* per existing PII rules (real_name is public per [PROGRESS.md]; phone is never in search). Confirm with `users.service` `canSeePhone` pattern — we do NOT return phone in search results.

### 3.2 Trips
- Match `title ILIKE %q%` OR `destination ILIKE %q%`.
- **Visibility filter (critical):** mirror `PolicyService.canReadTrip`:
  - `public` / `link_only` → always returned.
  - `followers` → only if viewer follows the owner.
  - `private` → only the owner.
  - Simplest correct query: `WHERE (visibility IN ('public','link_only')) OR (user_id = viewer) OR (visibility='followers' AND owner IN viewer's following set)`. Build the following-set once per request.
- Return `TripWithAuthor`-lite: id, title, destination, cover_image_url, stage, author. Cap 20.
- Rank: title prefix match first, then `fork_count desc` / recency.

### 3.3 Places
- Reuse the builder's `suggestPlaces()` (currently a **local function** in [builder/[id].tsx:73](trailr/app/builder/[id].tsx) using the Mapbox Search Box `suggest` endpoint with a session token).
- **Refactor:** extract it to `trailr/src/lib/places.ts` and import in both the builder and search. No API change — Mapbox is called client-side.
- Place result → v1 action: navigate to Explore with the coord as `center` (Explore already accepts a `center` prop per PROGRESS), OR open New-Trip prefilled. Pick Explore-recenter for v1 (lower lift).

---

## 4. Backend

New **SearchModule** (`api/src/modules/search/`) — keeps search logic out of users/trips controllers.

### Files
```
api/src/modules/search/
  search.module.ts
  search.controller.ts
  search.service.ts
  dto/search-query.dto.ts        # { q: string (min 2), limit?: number }
```

### Endpoints
| Method | Route | Auth | Returns |
|---|---|---|---|
| GET | `/search/users?q=&limit=` | `@PublicRead()` (viewer optional) | `UserSearchResult[]` |
| GET | `/search/trips?q=&limit=` | `@PublicRead()` | `TripSearchResult[]` |
| GET | `/search?q=&limit=` | `@PublicRead()` | `{ users, trips }` (combined, for the overlay's one call) |

- Use `@PublicRead()` + `@CurrentUser() viewerId: string | undefined` (the established optional-auth pattern, e.g. media pool / discover).
- Reject `q` shorter than 2 chars in the DTO (`@MinLength(2)`), trim server-side.

### search.service.ts (sketch)
```ts
async users(viewerId: string | null, q: string, limit = 20): Promise<UserSearchResult[]> {
  const rows = await this.prisma.user.findMany({
    where: { OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { display_name: { contains: q, mode: 'insensitive' } },
      { real_name: { contains: q, mode: 'insensitive' } },
    ]},
    select: { ...AUTHOR_SELECT, follower_count: true },
    take: limit,
  });
  // rank: username prefix first, then follower_count
  return rank(rows, q).map(toUserResult);
}

async trips(viewerId: string | null, q: string, limit = 20): Promise<TripSearchResult[]> {
  const followingIds = viewerId
    ? (await this.prisma.follow.findMany({ where: { follower_id: viewerId }, select: { following_id: true } })).map(f => f.following_id)
    : [];
  const rows = await this.prisma.trip.findMany({
    where: {
      AND: [
        { OR: [ { title: { contains: q, mode: 'insensitive' } }, { destination: { contains: q, mode: 'insensitive' } } ] },
        { OR: [
          { visibility: { in: ['public', 'link_only'] } },
          ...(viewerId ? [{ user_id: viewerId }] : []),
          { AND: [{ visibility: 'followers' }, { user_id: { in: followingIds } }] },
        ]},
      ],
    },
    include: { author: { select: AUTHOR_SELECT } },
    take: limit,
  });
  return rank(rows, q).map(toTripResult);
}
```
- `rank()` = small pure helper: prefix matches (`startsWith`) before substring, then by the secondary key.
- **Index note:** `ILIKE %q%` is a sequential scan. Fine at seed scale. If it ever matters, add a `pg_trgm` GIN index on the searched columns — out of scope, note in code.

---

## 5. Shared types

`packages/shared/src/search.ts` (+ export in index):
```ts
export interface UserSearchResult {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; follower_count: number;
}
export interface TripSearchResult {
  id: string; title: string; destination: string | null;
  cover_image_url: string | null; stage: 'planning' | 'living' | 'album';
  author: Author;
}
export interface SearchResults { users: UserSearchResult[]; trips: TripSearchResult[]; }
```
Mirror the same shapes in `packages/db/src/types/database.ts` (db is self-contained — no `@trailr/shared` import). Rebuild shared after (`npm run build -w @trailr/shared`).

---

## 6. db-client

`packages/db/src/queries/search.ts`:
```ts
export async function searchAll(q: string, limit = 5): Promise<SearchResults>
export async function searchUsers(q: string, limit = 20): Promise<UserSearchResult[]>
export async function searchTrips(q: string, limit = 20): Promise<TripSearchResult[]>
```
`packages/db/src/hooks/useSearch.ts`:
```ts
export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => searchAll(q, 5),
    enabled: q.trim().length >= 2,
    staleTime: 1000 * 30,
    // debounce handled in the component (q only updates after 250ms idle)
  });
}
export function useSearchUsers(q) / useSearchTrips(q)  // for the full screen, enabled when q>=2
```
Export both from `packages/db/src/index.ts` (queries + hooks blocks).

---

## 7. Frontend / UI

### 7.1 Make the box interactive
- `TopBar` search `<View>` → `<Pressable>`/`TextInput`. Two options:
  - **A (recommended):** the pill becomes a real `TextInput`; focusing it shows an absolute-positioned **results overlay** dropdown beneath it (desktop). Typing drives `useSearch` (debounced). Enter → `router.push('/search?q=...')`.
  - **B:** the pill is a button → navigates to a full `/search` screen with its own input (simpler, less slick). Use B on phone (no room for a dropdown), A on desktop.
- Add `searchQuery` state + 250ms debounce (`useDebouncedValue` hook — create if absent in `src/hooks/`).

### 7.2 Components
```
trailr/src/components/SearchOverlay.tsx   # desktop dropdown: grouped People/Trips/Places, top 3–5 each, "See all" → /search
trailr/app/search.tsx                     # full results screen: tabs or stacked sections, all results
trailr/src/lib/places.ts                  # extracted suggestPlaces (shared by builder + search)
```
- Result rows reuse existing primitives: `Avatar` + name/handle for people; `CoverImage` + title/destination + stage chip for trips; `⌕`/pin + place name for places.
- Empty/loading/no-results states (mirror feed's friendly empty + `ActivityIndicator`).

### 7.3 Navigation targets
- Person → `router.push(\`/profile/${username}\`)`.
- Trip → open by **stage** (reuse the Trips list's existing stage→route logic: planning→`builder/[id]`, living→`journal/[id]`, album→`album/[id]`). Extract that mapping to a tiny helper `tripHref(trip)` in `src/lib/` and reuse.
- Place → `router.push(\`/(tabs)/explore?lat=&lng=\`)` and have Explore read the param into its `center` prop (Explore already supports `center`).

### 7.4 Refactor: extract `suggestPlaces`
- Move the function (and its `session_token`/`proximity` logic) from `builder/[id].tsx` to `src/lib/places.ts`. Builder imports it (surgical; behavior unchanged). Search imports it too. **Verify the builder place search still works after the move** (regression check).

---

## 8. File-by-file change list

**API**
- `api/src/modules/search/{search.module,search.controller,search.service}.ts` — new.
- `api/src/modules/search/dto/search-query.dto.ts` — new.
- `api/src/app.module.ts` — register `SearchModule`.

**Shared**
- `packages/shared/src/search.ts` — new; export in `index.ts`.

**db-client**
- `packages/db/src/types/database.ts` — add the 3 result interfaces.
- `packages/db/src/queries/search.ts` — new.
- `packages/db/src/hooks/useSearch.ts` — new.
- `packages/db/src/index.ts` — export both.

**App**
- `trailr/src/components/TopBar.tsx` — activate the box (input + overlay/nav).
- `trailr/src/components/SearchOverlay.tsx` — new.
- `trailr/app/search.tsx` — new full screen.
- `trailr/src/lib/places.ts` — extracted helper.
- `trailr/src/lib/tripHref.ts` — extracted stage→route helper (also refactor Trips list to use it).
- `trailr/app/builder/[id].tsx` — import `suggestPlaces` from the new lib (remove the local copy).
- `trailr/src/hooks/useDebouncedValue.ts` — new (if not present).
- `trailr/app/(tabs)/explore.tsx` — read `lat`/`lng` route params → `center` (small).

---

## 9. Step plan with verification

```
1. Backend SearchModule + DTO + endpoints      → verify: API boots, routes mapped;
                                                  curl /search?q=osa returns Osaka trip;
                                                  curl as non-follower → private trips absent
2. Shared types + rebuild                        → verify: tsc (shared) clean
3. db queries + hooks + exports                  → verify: tsc (db) clean
4. Extract places.ts + tripHref.ts; rewire builder → verify: tsc (trailr); builder place search still works in browser
5. TopBar input + SearchOverlay (desktop dropdown) → verify: type "wan" → Wanwisa appears; "osaka" → trip; click navigates
6. /search full screen + phone path               → verify: Enter opens screen; phone shows screen not dropdown
7. explore center param                            → verify: place result recenters explore map
```

Each backend step verified by `curl` with somchai vs ploy tokens (auth correctness), same approach used for chat/pool. UI verified via the browser (snapshot/click — note `preview_screenshot` times out on Mapbox screens; use `preview_snapshot`).

---

## 10. Test data

Seed already supports this — no new seed strictly needed:
- People: "som"/"wan"/"ploy", display + real names exist.
- Trips: "Japan", "Chiang Mai", "Ramen", "Osaka" (varied `destination`).
- **Add one private + one followers-only trip** to the seed to prove the visibility filter (e.g. flip an existing trip's visibility, or add a 5th). Owned by ploy so somchai (who doesn't follow… actually somchai follows ploy) — pick owners deliberately so the test asserts both "hidden" and "shown via follow" paths.

---

## 11. Decisions (all RESOLVED — 2026-06-20)

1. **Results UI** → **Overlay dropdown + "See all" on desktop; full-screen `/search` on phone.** The TopBar pill becomes a real `TextInput`; focusing + typing (≥2 chars, debounced) drops a grouped panel beneath it (top 3–5 per group) with a "See all results" footer → `/search?q=`. Phone has no room for the dropdown, so the box there is a button → the full screen. Build both `SearchOverlay.tsx` (desktop) and `app/search.tsx` (full).
2. **Place result action** → **Recenter the Explore map.** Place result → `router.push('/(tabs)/explore?lat=&lng=')`; Explore reads the params into its existing `center` prop. (Not New-Trip prefill — lower lift, matches "I want to look there".) Places stay **in** v1, so the `suggestPlaces` → `src/lib/places.ts` extraction is required.
3. **`real_name` searchable** → **Yes.** Match `username` + `display_name` + `real_name`. `real_name` is already public on profiles; **`phone` is never searched or returned** (no change to PII rules). "Wanwisa Phokin" is findable by real name.
4. **Ranking** → **prefix-match then secondary key.** People: username-prefix before substring, then `follower_count desc`. Trips: title-prefix first, then `fork_count desc`. No follow-graph boosting in v1. `pg_trgm` GIN index is the documented upgrade path if `ILIKE` gets slow.
5. **Endpoint shape** → **combined `/search` for the overlay** (one round-trip, top-5/group) **+ separate `/search/users` & `/search/trips` for the full screen** (per-tab, higher cap).

No open questions remain — this plan is ready to execute as written.

---

## 12. Estimate

- Backend (module + 3 endpoints + auth filter): ~small.
- Shared + db-client: ~small (mirrors existing patterns).
- UI (TopBar input, overlay, full screen, two extractions): ~medium — the bulk of the work.
- Total: one focused session, same shape as the settle-up / chat slices.
