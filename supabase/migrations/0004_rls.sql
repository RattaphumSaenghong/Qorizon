-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Row Level Security (0004)                                ║
-- ║  Default deny; explicit policies per table.                        ║
-- ║  Service role (edge functions, triggers) bypasses RLS.             ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Readability helper ───────────────────────────────────────────────
-- A trip is readable by: its owner; anyone if public/link_only;
-- followers if 'followers'. 'private' → owner only.
create or replace function public.can_read_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and (
        t.user_id = auth.uid()
        or t.visibility in ('public','link_only')
        or (t.visibility = 'followers' and exists (
              select 1 from public.follows f
              where f.following_id = t.user_id and f.follower_id = auth.uid()
        ))
      )
  );
$$;

-- helper: does auth.uid() own this trip?
create or replace function public.owns_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trips t where t.id = p_trip_id and t.user_id = auth.uid()
  );
$$;

-- Enable RLS everywhere
alter table public.users         enable row level security;
alter table public.trips         enable row level security;
alter table public.trip_days     enable row level security;
alter table public.stops         enable row level security;
alter table public.media         enable row level security;
alter table public.trail_points  enable row level security;
alter table public.live_batches  enable row level security;
alter table public.follows       enable row level security;
alter table public.likes         enable row level security;
alter table public.comments      enable row level security;
alter table public.saved_items   enable row level security;
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;

-- ── users ────────────────────────────────────────────────────────────
create policy users_read   on public.users for select using (true);
create policy users_update on public.users for update using (id = auth.uid());
-- inserts handled by handle_new_user() (security definer)

-- ── trips ────────────────────────────────────────────────────────────
create policy trips_read   on public.trips for select using (public.can_read_trip(id));
create policy trips_insert on public.trips for insert with check (user_id = auth.uid());
create policy trips_update on public.trips for update using (user_id = auth.uid());
create policy trips_delete on public.trips for delete using (user_id = auth.uid());

-- ── trip_days ────────────────────────────────────────────────────────
create policy days_read   on public.trip_days for select using (public.can_read_trip(trip_id));
create policy days_insert on public.trip_days for insert with check (public.owns_trip(trip_id));
create policy days_update on public.trip_days for update using (public.owns_trip(trip_id));
create policy days_delete on public.trip_days for delete using (public.owns_trip(trip_id));

-- ── stops ────────────────────────────────────────────────────────────
create policy stops_read   on public.stops for select using (public.can_read_trip(trip_id));
create policy stops_insert on public.stops for insert with check (public.owns_trip(trip_id));
create policy stops_update on public.stops for update using (public.owns_trip(trip_id));
create policy stops_delete on public.stops for delete using (public.owns_trip(trip_id));

-- ── media ────────────────────────────────────────────────────────────
create policy media_read on public.media for select using (
  exists (select 1 from public.stops s where s.id = stop_id and public.can_read_trip(s.trip_id))
);
create policy media_write_ins on public.media for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stops s
    where s.id = stop_id and public.owns_trip(s.trip_id)
  )
);
create policy media_write_upd on public.media for update using (user_id = auth.uid());
create policy media_write_del on public.media for delete using (user_id = auth.uid());

-- ── trail_points ─────────────────────────────────────────────────────
create policy trail_read   on public.trail_points for select using (public.can_read_trip(trip_id));
create policy trail_insert on public.trail_points for insert with check (public.owns_trip(trip_id));
create policy trail_delete on public.trail_points for delete using (public.owns_trip(trip_id));

-- ── live_batches ─────────────────────────────────────────────────────
create policy batches_read  on public.live_batches for select using (public.can_read_trip(trip_id));
create policy batches_write on public.live_batches for all
  using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

-- ── follows (public graph) ───────────────────────────────────────────
create policy follows_read   on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (follower_id = auth.uid());
create policy follows_delete on public.follows for delete using (follower_id = auth.uid());

-- ── likes ────────────────────────────────────────────────────────────
create policy likes_read   on public.likes for select using (true);
create policy likes_insert on public.likes for insert with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete using (user_id = auth.uid());

-- ── comments ─────────────────────────────────────────────────────────
create policy comments_read on public.comments for select using (
  exists (select 1 from public.stops s where s.id = stop_id and public.can_read_trip(s.trip_id))
);
create policy comments_insert on public.comments for insert with check (user_id = auth.uid());
create policy comments_delete on public.comments for delete using (user_id = auth.uid());

-- ── saved_items (private to owner) ───────────────────────────────────
create policy saved_all on public.saved_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── bookings (private to owner) ──────────────────────────────────────
create policy bookings_all on public.bookings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── notifications (recipient only; inserts via service role) ─────────
create policy notifs_read   on public.notifications for select using (user_id = auth.uid());
create policy notifs_update on public.notifications for update using (user_id = auth.uid());
