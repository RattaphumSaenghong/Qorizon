-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Indexes (0002)                                           ║
-- ║  Tuned for the actual query shapes in @trailr/db.                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Trips by author (profile Trips tab, "my trips")
create index idx_trips_user_id      on public.trips (user_id, created_at desc);
create index idx_trips_visibility   on public.trips (visibility) where visibility in ('public','followers');
create index idx_trips_forked_from  on public.trips (forked_from_id);

-- Trip days ordered within a trip
create index idx_trip_days_trip     on public.trip_days (trip_id, day_number);

-- Stops: by trip (journal/builder), by day (ordered), by status (feed = visited)
create index idx_stops_trip         on public.stops (trip_id, sort_order);
create index idx_stops_day          on public.stops (day_id, sort_order);
create index idx_stops_user_visited on public.stops (user_id, captured_at desc) where status = 'visited';
create index idx_stops_batch        on public.stops (trip_id, batch_date);

-- Media by stop (album / journal)
create index idx_media_stop         on public.media (stop_id, sort_order);

-- Trail points: efficient time-ordered trail render (from §5.5)
create index idx_trail_points_trip  on public.trail_points (trip_id, recorded_at);

-- Live batches by trip/date
create index idx_live_batches_trip  on public.live_batches (trip_id, batch_date);

-- Social graph lookups
create index idx_follows_following  on public.follows (following_id);   -- "who follows me"
create index idx_likes_stop         on public.likes (stop_id);
create index idx_comments_stop      on public.comments (stop_id, created_at);

-- Saved items per user
create index idx_saved_user         on public.saved_items (user_id, created_at desc);

-- Bookings per user / trip
create index idx_bookings_user      on public.bookings (user_id, created_at desc);
create index idx_bookings_trip      on public.bookings (trip_id);

-- Notifications: unread for a recipient, newest first
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id) where read = false;
