# Design — Notifications for Chat & Invites

> Status: **PLAN ONLY — not implemented.** 5 decisions to confirm in §9.
> Closes the "no push/notification on new message" gap noted in the trip-chat work,
> and fixes existing `trip_invite` drift along the way.

---

## 1. Goal

Collaborators currently get no signal when something happens on a shared trip unless
they open it. Deliver **in-app** notifications (bell badge + notifications screen) for:

- **New chat message** — a collaborator posts in the trip chat → other collaborators are notified.
- **Invite response** — an invited user accepts (or declines) → the trip **owner** is notified.
- **Fix `trip_invite`** — the invite notification is *already created* by `members.service`
  but the type is undeclared everywhere, so it renders as "did something" and mis-navigates.

**Out of scope:** real push (APNs/FCM/Expo push) — this stack has no push transport
(`push_sent` column exists but is unused). v1 is in-app only. Also out: digesting/grouping
across trips, notification preferences/mute, email.

**Success criteria**
1. somchai posts in Osaka chat → wanwisa's bell shows an unread count; the row reads
   "@somchai sent a message in Osaka Weekend"; tapping opens the trip.
2. Sending 5 messages in a row produces **one** unread chat notification for wanwisa, not 5 (coalesced).
3. wanwisa accepts a trip invite → somchai (owner) is notified "@wanwisa joined Osaka Weekend".
4. The existing invite notification renders correctly ("@somchai invited you to Osaka Weekend")
   and taps through to the Trips screen, not a broken journal link.
5. The bell badge updates without a manual navigation (unread count polls).
6. Auth-correct: only collaborators get chat notifications; only the owner gets invite-response ones.

---

## 2. Current state (what already exists)

**Infra is all there** — this is wiring writes into two services, not new infrastructure.

- `Notification` table: `user_id, type, actor_id?, trip_id?, stop_id?, batch_id?, read, push_sent, created_at`
  (`api/prisma/schema.prisma:375`). **No migration needed** — `trip_id`/`actor_id` already cover our needs.
- Read API: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`,
  `PATCH /notifications/:id/read` (`notifications.controller.ts`).
- Hooks: `useNotifications`, `useUnreadCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`.
- UI: `app/notifications.tsx` (list + mark-read) and the `NotificationBell` badge in `TopBar`.
- **Writes today:** `live_batch` (`live.service`), `trip_invite` (`members.service.invite` — line 27).

**The drift:** `NOTIFICATION_TYPE` in `packages/shared/src/notifications.ts` is
`['live_batch','follow','like','comment']`. It's missing `trip_invite` even though that
notification is already being written. The frontend `message()` switch (`notifications.tsx:21`)
has no case for it → falls through to "did something", and `open()` pushes `/journal/:id`
unconditionally (wrong target for an invite).

---

## 3. New notification types

Add three string types (matching the existing snake style `live_batch`):

| type | recipient | actor | trip | rendered text | tap target |
|---|---|---|---|---|---|
| `trip_invite` *(existing, fixing)* | invited user | owner | trip | "@owner invited you to {title}" | `/(tabs)/trips` (invites live there) |
| `trip_message` *(new)* | other collaborators | sender | trip | "@sender sent a message in {title}" | trip via `tripHref` |
| `member_accepted` *(new)* | owner | responder | trip | "@responder joined {title}" | trip via `tripHref` |
| `member_declined` *(new, optional)* | owner | responder | trip | "@responder declined {title}" | trip via `tripHref` |

> **Decision D2** — include `member_declined`, or accept-only? Recommend **both** (owner wants
> to know either way for planning). Two distinct types keeps the renderer trivial.

---

## 4. Backend changes

### 4.1 Chat → notify collaborators (`messages.service.create`)

After creating the message, fan out to **owner + accepted members, minus the sender**,
with **coalescing** so rapid messages don't spam the bell:

```ts
// after this.prisma.tripMessage.create(...)
await this.notifyCollaborators(tripId, userId);   // fire-and-forget after the message is saved

private async notifyCollaborators(tripId: string, senderId: string) {
  const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { user_id: true } });
  const members = await this.prisma.tripMember.findMany({
    where: { trip_id: tripId, status: 'accepted' },
    select: { user_id: true },
  });
  const recipients = [...new Set([trip!.user_id, ...members.map(m => m.user_id)])]
    .filter(id => id !== senderId);

  for (const userId of recipients) {
    // Coalesce: if an unread chat notification for this trip already exists, bump it; else create.
    const bumped = await this.prisma.notification.updateMany({
      where: { user_id: userId, trip_id: tripId, type: 'trip_message', read: false },
      data: { actor_id: senderId, created_at: new Date() },
    });
    if (bumped.count === 0) {
      await this.prisma.notification.create({
        data: { user_id: userId, type: 'trip_message', actor_id: senderId, trip_id: tripId },
      });
    }
  }
}
```

- Coalescing keeps "1 unread per trip with chat activity" — the intended UX (notify when chat is
  *closed*; once they open it / read it, the next message starts a fresh one).
- Matches the existing inline-write style (members + live both inline `prisma.notification.create`).
  No `NotificationsService` injection / module wiring needed → surgical.
- `created_at` is a plain `@default(now())` (not `@updatedAt`), so setting it explicitly is fine and
  re-sorts the bumped notification to the top.

### 4.2 Invite response → notify owner (`members.service.respond`)

`respond()` already has the member row (so it knows the owner via `invited_by`, or look up the trip):

```ts
// after the tripMember.update in respond()
const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { user_id: true } });
if (trip) {
  await this.prisma.notification.create({
    data: {
      user_id: trip.user_id,                                   // owner
      type: status === 'accepted' ? 'member_accepted' : 'member_declined',
      actor_id: userId,                                        // the responder
      trip_id: tripId,
    },
  });
}
```

No notification if the owner is the responder (can't happen — owner isn't an invited member).

### 4.3 No new endpoints, no migration

The read API and table are unchanged. This is purely two write sites + the type list.

---

## 5. Shared + db types

- `packages/shared/src/notifications.ts` → extend `NOTIFICATION_TYPE`:
  `['live_batch','follow','like','comment','trip_invite','trip_message','member_accepted','member_declined']`.
  Rebuild shared (`npm run build -w @trailr/shared`).
- `packages/db/src/types/database.ts` → mirror the same union on `NotificationType` (db is self-contained).
- No query/hook changes — the read shape is identical.

---

## 6. Frontend changes

### 6.1 Render the new types (`app/notifications.tsx`)

Extend `message(n)`:
```ts
case 'trip_invite':     return `${who} invited you${n.trip ? ` to ${n.trip.title}` : ''}`;
case 'trip_message':    return `${who} sent a message${n.trip ? ` in ${n.trip.title}` : ''}`;
case 'member_accepted': return `${who} joined${n.trip ? ` ${n.trip.title}` : ''}`;
case 'member_declined': return `${who} declined${n.trip ? ` ${n.trip.title}` : ''}`;
```

### 6.2 Type-aware navigation (`open()`), reusing `tripHref`

`open()` currently hard-codes `/journal/:id`. Replace with:
```ts
const open = (n: NotificationItem) => {
  if (!n.read) markRead.mutate(n.id);
  if (n.type === 'trip_invite') { router.push('/(tabs)/trips'); return; }
  if (n.trip) router.push(tripHref({ id: n.trip.id }));   // stage-correct screen
};
```
> **Caveat C1:** `n.trip` carries only `{id, title}` — no `stage`. `tripHref` with an undefined
> stage defaults to `/builder/:id`. For a v1 that's acceptable (collaborator trips are usually in
> planning). If we want exact-stage routing, add `stage` to the notification's trip projection in
> `notifications.service.list` (one extra select field). **Decision D3.**

### 6.3 Bell badge should poll (`packages/db/src/hooks/useNotifications.ts`)

`useUnreadCount` currently only has `staleTime: 30s` — the badge won't change until something
else triggers a refetch. Add `refetchInterval: 1000 * 60` (and `refetchOnWindowFocus: true`)
so a new chat message surfaces on the bell within a minute without navigation.
> **Decision D4:** poll interval — 60s (gentle) vs 30s (snappier). Recommend **60s**; chat itself
> already polls 5s when open, so the bell is only for the closed-app case.

### 6.4 (Optional polish) clear chat notifications when opening chat

When `TripChatModal` opens, the unread `trip_message` notification for that trip is now stale.
Optional: call a "mark read for trip" action. **Deferred** unless trivial — tapping the
notification already marks it read, and it coalesces, so the bell won't pile up. Noted, not built.

---

## 7. File-by-file change list

**Backend**
- `api/src/modules/messages/messages.service.ts` — add `notifyCollaborators`, call from `create`.
- `api/src/modules/members/members.service.ts` — write owner notification in `respond`.

**Shared**
- `packages/shared/src/notifications.ts` — extend `NOTIFICATION_TYPE`. Rebuild.

**db-client**
- `packages/db/src/types/database.ts` — mirror `NotificationType` union.
- `packages/db/src/hooks/useNotifications.ts` — `refetchInterval` on `useUnreadCount`.

**App**
- `trailr/app/notifications.tsx` — `message()` cases + type-aware `open()` (import `tripHref`);
  update the file's doc comment.
- *(if D3 = exact stage)* `api/src/modules/notifications/notifications.service.ts` — add `stage`
  to the trip select; `packages/shared` + `packages/db` `NotificationItem.trip` gains `stage`.

---

## 8. Step plan with verification

```
1. Shared + db type unions + rebuild            → tsc (shared, db) clean
2. messages.service notify + members.service     → API boots; unit-check via curl below
3. useUnreadCount refetchInterval                → tsc (db) clean
4. notifications.tsx render + nav                → tsc (trailr) clean
5. End-to-end in browser                         → see §8.1
```

### 8.1 curl checks (somchai owner, wanwisa member, ploy outsider — Osaka seed trip)
- wanwisa POSTs a message → `GET /notifications` as **somchai** shows a `trip_message` row; as **ploy** shows nothing.
- somchai POSTs 3 messages → wanwisa's `GET /notifications/unread-count` rises by **1**, not 3 (coalesce).
- wanwisa already had an unread chat notif, reads it, somchai posts again → a **new** one appears (fresh after read).
- A fresh invite + accept cycle → owner gets `member_accepted`.

### 8.2 Browser
- Sign in as the seed user, open the bell, confirm rows render with correct text and tap targets.
- `preview_snapshot` for text; the bell badge count after triggering a message via a second session/curl.

---

## 9. Decisions to confirm

1. **D1 — Push?** In-app only for v1 (no push transport in stack). Recommend **yes, in-app only**;
   defer real push. *(low-risk default; flagged because the feature title said "push/in-app".)*
2. **D2 — Decline notifications?** Notify owner on **both** accept and decline, or accept-only?
   Recommend **both** (`member_accepted` + `member_declined`).
3. **D3 — Exact-stage routing for trip notifications?** Add `stage` to the notification trip
   projection (exact screen), or accept `tripHref` defaulting to builder? Recommend **add `stage`**
   — it's one select field and makes every trip notification land on the right screen.
4. **D4 — Unread badge poll interval?** Recommend **60s**.
5. **D5 — Coalesce chat notifications?** Recommend **yes** (1 unread per trip until read). The only
   alternative (one per message) spams the bell; not recommended.

All five have clear recommended defaults — if you're happy with the recommendations this is
ready to build as written.

---

## 10. Estimate

- Backend (2 write sites, no migration, no endpoints): **small**.
- Shared/db type unions + hook interval: **trivial**.
- Frontend (renderer + nav): **small**.
- Total: well under the settle-up / search slices — most of the infra already exists.
```
