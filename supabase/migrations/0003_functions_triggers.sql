-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Functions & Triggers (0003)                             ║
-- ║  Denormalised counters, updated_at, auth bootstrap, fork.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── updated_at touch ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_trips_updated
  before update on public.trips
  for each row execute function public.touch_updated_at();

create trigger trg_stops_updated
  before update on public.stops
  for each row execute function public.touch_updated_at();

-- ── New auth user → profile row ──────────────────────────────────────
-- Username seeded from email local-part (+ short random suffix to avoid
-- collisions). User edits it later.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
begin
  base_username := split_part(coalesce(new.email, 'traveller'), '@', 1);
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_.]', '', 'g');
  if base_username = '' then base_username := 'traveller'; end if;
  final_username := base_username || '.' || substr(md5(new.id::text), 1, 4);

  insert into public.users (id, username, display_name, language)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', base_username),
    coalesce(new.raw_user_meta_data->>'language', 'th')
  );
  return new;
end $$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Like counter ─────────────────────────────────────────────────────
create or replace function public.sync_like_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.stops set like_count = like_count + 1 where id = new.stop_id;
  elsif tg_op = 'DELETE' then
    update public.stops set like_count = greatest(0, like_count - 1) where id = old.stop_id;
  end if;
  return null;
end $$;

create trigger trg_likes_count
  after insert or delete on public.likes
  for each row execute function public.sync_like_count();

-- ── Comment counter ──────────────────────────────────────────────────
create or replace function public.sync_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.stops set comment_count = comment_count + 1 where id = new.stop_id;
  elsif tg_op = 'DELETE' then
    update public.stops set comment_count = greatest(0, comment_count - 1) where id = old.stop_id;
  end if;
  return null;
end $$;

create trigger trg_comments_count
  after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- ── Follow counters ──────────────────────────────────────────────────
create or replace function public.sync_follow_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.users set following_count = following_count + 1 where id = new.follower_id;
    update public.users set follower_count  = follower_count  + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.users set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.users set follower_count  = greatest(0, follower_count  - 1) where id = old.following_id;
  end if;
  return null;
end $$;

create trigger trg_follows_count
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

-- ── Fork a trip ──────────────────────────────────────────────────────
-- Deep-copies a trip's PLAN (trip row, days, stops reset to 'planned'
-- with story data stripped). Story data — media, captions, likes,
-- comments, captured_at — is intentionally NOT copied. Bumps the
-- source trip's fork_count. Returns the new trip id.
--
-- p_mode:
--   'full' → copy every stop.
--   'skim' → copy experiential stops only; drop logistics
--            (hotel/flight/transport) and any day left empty. "Give me
--            their spots & food, I'll book my own stays."
create or replace function public.fork_trip(
  p_source_trip_id uuid,
  p_new_user_id    uuid default null,
  p_mode           text default 'full'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_new_trip_id uuid;
  v_owner uuid;
  v_day record;
  v_new_day_id uuid;
  v_copied int;
begin
  if p_mode not in ('full','skim') then
    raise exception 'fork_trip: p_mode must be full or skim, got %', p_mode;
  end if;

  -- Owner is ALWAYS the caller when authenticated; the param is only a
  -- fallback for service-role/seed contexts where auth.uid() is null.
  v_owner := coalesce(auth.uid(), p_new_user_id);
  if v_owner is null then
    raise exception 'fork_trip: no owner (not authenticated and no fallback id)';
  end if;

  -- Source must be readable by the caller (RLS-equivalent check)
  if not public.can_read_trip(p_source_trip_id) then
    raise exception 'fork_trip: source trip not found or not visible';
  end if;

  -- 1. copy the trip shell
  insert into public.trips (
    user_id, title, description, cover_image_url,
    status, live_mode, live_cadence, visibility,
    forked_from_id, start_date, end_date
  )
  select
    v_owner, title, description, cover_image_url,
    'draft', false, live_cadence, 'private',
    id, start_date, end_date
  from public.trips
  where id = p_source_trip_id
  returning id into v_new_trip_id;

  -- 2. copy days, remapping stops to the new day ids
  for v_day in
    select * from public.trip_days where trip_id = p_source_trip_id order by day_number
  loop
    insert into public.trip_days (trip_id, day_number, place, date)
    values (v_new_trip_id, v_day.day_number, v_day.place, v_day.date)
    returning id into v_new_day_id;

    -- 3. copy that day's stops — plan fields only, reset to planned.
    --    Skim mode drops logistics (hotel/flight/transport).
    insert into public.stops (
      trip_id, day_id, user_id, status, category,
      location_name, latitude, longitude, place_id,
      planned_time, duration_mins, sort_order, notes
    )
    select
      v_new_trip_id, v_new_day_id, v_owner, 'planned', category,
      location_name, latitude, longitude, place_id,
      planned_time, duration_mins, sort_order, notes
    from public.stops
    where day_id = v_day.id
      and (p_mode = 'full' or category not in ('hotel','flight','transport'));

    get diagnostics v_copied = row_count;

    -- skim: drop the day if nothing landed in it
    if p_mode = 'skim' and v_copied = 0 then
      delete from public.trip_days where id = v_new_day_id;
    end if;
  end loop;

  -- 4. copy any stops not attached to a day (loose plan items)
  insert into public.stops (
    trip_id, day_id, user_id, status, category,
    location_name, latitude, longitude, place_id,
    planned_time, duration_mins, sort_order, notes
  )
  select
    v_new_trip_id, null, v_owner, 'planned', category,
    location_name, latitude, longitude, place_id,
    planned_time, duration_mins, sort_order, notes
  from public.stops
  where trip_id = p_source_trip_id and day_id is null
    and (p_mode = 'full' or category not in ('hotel','flight','transport'));

  -- 5. bump source fork_count
  update public.trips set fork_count = fork_count + 1 where id = p_source_trip_id;

  return v_new_trip_id;
end $$;
