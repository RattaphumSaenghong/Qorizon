-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Schema (0001)                                            ║
-- ║  Unified "stops" lifecycle model:                                  ║
-- ║    a stop is PLANNED (builder) → VISITED (journal/feed).           ║
-- ║    The same row carries both the plan and the story.               ║
-- ║  Supersedes the separate `posts` / `itinerary_items` tables        ║
-- ║  described in TRAILR_ARCHITECTURE_1.md §5.                         ║
-- ╚══════════════════════════════════════════════════════════════════╝

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Users ────────────────────────────────────────────────────────────
-- Profile row, 1:1 with auth.users (same uuid). Created by a trigger
-- on auth.users insert (see 0003).
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text,
  avatar_url      text,
  bio             text,
  language        text not null default 'th' check (language in ('th','en')),
  follower_count  int  not null default 0,
  following_count int  not null default 0,
  created_at      timestamptz not null default now()
);

-- ── Trips ────────────────────────────────────────────────────────────
create table public.trips (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  cover_image_url text,
  status          text not null default 'draft'
                    check (status in ('draft','active','completed')),
  live_mode       boolean not null default false,
  live_cadence    text not null default 'daily'
                    check (live_cadence in ('hourly','daily','manual')),
  visibility      text not null default 'public'
                    check (visibility in ('public','followers','link_only','private')),
  forked_from_id  uuid references public.trips(id) on delete set null,
  fork_count      int  not null default 0,
  start_date      date,
  end_date        date,
  -- Album = derived view of this trip's visited stops + these user edits:
  --   { "order": [stop_id...], "captions": { "<media_id>": "text" }, "excluded": [media_id...] }
  album_overrides jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Trip days ────────────────────────────────────────────────────────
-- Day-level metadata: "Day 3 — Kyoto · Apr 14". Read by both builder
-- (plan) and journal (story).
create table public.trip_days (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  day_number  int  not null,
  place       text,
  date        date,
  unique (trip_id, day_number)
);

-- ── Stops (the unified plan↔story unit) ──────────────────────────────
create table public.stops (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  day_id        uuid references public.trip_days(id) on delete set null,
  user_id       uuid not null references public.users(id) on delete cascade,

  -- lifecycle: the heart of the unified model
  status        text not null default 'planned'
                  check (status in ('planned','visited','skipped')),

  -- what kind of stop — drives skim-fork (logistics excluded) & builder blocks
  category      text not null default 'place'
                  check (category in ('place','landmark','food','activity',
                                      'hotel','flight','transport','note')),

  -- place (both faces need this)
  location_name text,
  latitude      float8,
  longitude     float8,
  place_id      text,                       -- Mapbox place id

  -- ── plan face ──
  planned_time  text,                       -- 'HH:MM' local, kept simple
  duration_mins int,
  sort_order    int  not null default 0,    -- order within the day
  notes         text,

  -- ── story face (populated once visited) ──
  caption       text,
  captured_at   timestamptz,
  batch_date    date,                       -- which live batch it belongs to

  -- social (a visited stop behaves as a "post")
  like_count    int  not null default 0,
  comment_count int  not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Media ────────────────────────────────────────────────────────────
-- Many media per stop (12 photos at one place is normal).
create table public.media (
  id            uuid primary key default gen_random_uuid(),
  stop_id       uuid not null references public.stops(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  type          text not null check (type in ('photo','video','audio')),
  url           text not null,              -- Supabase Storage path
  cdn_url       text,                       -- Cloudflare CDN url
  latitude      float8,                     -- parsed from EXIF
  longitude     float8,
  captured_at   timestamptz,                -- EXIF timestamp
  duration_secs int,                        -- video/audio
  size_bytes    bigint,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Trail points (live GPS trail) ────────────────────────────────────
create table public.trail_points (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  latitude    float8 not null,
  longitude   float8 not null,
  altitude    float8,
  recorded_at timestamptz not null default now()
);

-- ── Live batches ─────────────────────────────────────────────────────
create table public.live_batches (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  batch_date   date not null,
  title        text,
  stop_ids     uuid[] not null default '{}',
  published_at timestamptz,
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Social graph ─────────────────────────────────────────────────────
create table public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.likes (
  user_id    uuid not null references public.users(id) on delete cascade,
  stop_id    uuid not null references public.stops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stop_id)
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  stop_id    uuid not null references public.stops(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

-- ── Saved / bookmarks ────────────────────────────────────────────────
create table public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  stop_id    uuid references public.stops(id) on delete cascade,
  trip_id    uuid references public.trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (stop_id is not null or trip_id is not null)
);

-- ── Bookings ─────────────────────────────────────────────────────────
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  trip_id        uuid references public.trips(id) on delete set null,
  type           text not null check (type in ('flight','hotel')),
  provider       text not null check (provider in ('amadeus','agoda','booking_com')),
  external_ref   text,
  status         text not null default 'pending'
                   check (status in ('pending','confirmed','cancelled')),
  amount_thb     numeric(10,2),
  commission_thb numeric(10,2),
  raw_payload    jsonb,
  created_at     timestamptz not null default now()
);

-- ── Notifications ────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,  -- recipient
  type       text not null check (type in ('live_batch','follow','like','comment')),
  actor_id   uuid references public.users(id) on delete cascade,
  trip_id    uuid references public.trips(id) on delete cascade,
  stop_id    uuid references public.stops(id) on delete cascade,
  batch_id   uuid references public.live_batches(id) on delete cascade,
  read       boolean not null default false,
  push_sent  boolean not null default false,
  created_at timestamptz not null default now()
);
