-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Seed data                                                ║
-- ║  Users created via Supabase Auth dashboard (trigger auto-created   ║
-- ║  their public.users rows). This script sets nice handles, adds     ║
-- ║  follows, trips, days, and stops.                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── 1. Polish user profiles ──────────────────────────────────────────
update public.users set
  username     = 'somchai.travels',
  display_name = 'Somchai Rattana',
  bio          = 'Chasing temples, noodles, and mountain roads. Based in Bangkok · 14 countries'
where id = '8268109c-d929-490b-b3de-d48d45571174';

update public.users set
  username     = 'wanwisa.wanders',
  display_name = 'Wanwisa Prom',
  bio          = 'Slow travel, hill tribes, mountain air.'
where id = '3cc12b01-1308-46c9-b58e-783eb5a31162';

update public.users set
  username     = 'ploy.eats',
  display_name = 'Khun Ploy',
  bio          = 'I travel for the food. Mostly ramen.'
where id = '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f';

-- ── 2. Follows ───────────────────────────────────────────────────────
insert into public.follows (follower_id, following_id) values
  ('8268109c-d929-490b-b3de-d48d45571174','3cc12b01-1308-46c9-b58e-783eb5a31162'),
  ('8268109c-d929-490b-b3de-d48d45571174','3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f'),
  ('3cc12b01-1308-46c9-b58e-783eb5a31162','8268109c-d929-490b-b3de-d48d45571174'),
  ('3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f','8268109c-d929-490b-b3de-d48d45571174');

-- ── 3. Trip 1: 7 Days in Japan (somchai) ─────────────────────────────
insert into public.trips
  (id, user_id, title, description, status, visibility, start_date, end_date)
values
  ('aaaa0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174',
   '7 Days in Japan', 'Tokyo → Hakone → Kyoto → Osaka',
   'completed', 'public', '2026-04-12', '2026-04-18');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('dddd0001-0000-0000-0000-000000000001','aaaa0001-0000-0000-0000-000000000001',1,'Tokyo', '2026-04-12'),
  ('dddd0001-0000-0000-0000-000000000002','aaaa0001-0000-0000-0000-000000000001',2,'Hakone','2026-04-13'),
  ('dddd0001-0000-0000-0000-000000000003','aaaa0001-0000-0000-0000-000000000001',3,'Kyoto', '2026-04-14'),
  ('dddd0001-0000-0000-0000-000000000004','aaaa0001-0000-0000-0000-000000000001',4,'Osaka', '2026-04-15');

insert into public.stops
  (trip_id, day_id, user_id, status, category,
   location_name, latitude, longitude,
   planned_time, sort_order, caption, captured_at)
values
  -- Day 1 · Tokyo
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174','visited','food',
   'Tsukiji Outer Market',35.6654,139.7697,'08:40',0,
   'Best tuna sashimi at 8am. The market opens early but the energy is unreal — fishermen, chefs, tourists all crammed into tiny alleyways.',
   '2026-04-12 08:40:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174','visited','activity',
   'teamLab Planets',35.6480,139.7940,'13:10',1,
   'You walk through knee-deep reflective water into a room of a million flowers. Nothing prepares you for it.',
   '2026-04-12 13:10:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174','visited','landmark',
   'Shibuya Crossing',35.6595,139.6980,'19:30',2,
   'Shot from the Mag''s Park rooftop. Every time the light turns, ~3,000 people cross at once.',
   '2026-04-12 19:30:00+09'),
  -- logistics on day 1 (skim-fork will drop these)
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174','visited','flight',
   'TG660 · BKK → HND',35.5494,139.7798,'06:00',-1,
   'Red-eye into Haneda.',
   '2026-04-12 06:00:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000001',
   '8268109c-d929-490b-b3de-d48d45571174','visited','hotel',
   'Shinjuku Granbell Hotel',35.6938,139.7036,'22:00',9,
   'Base for nights 1–2.',
   '2026-04-12 22:00:00+09'),
  -- Day 2 · Hakone
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000002',
   '8268109c-d929-490b-b3de-d48d45571174','visited','landmark',
   'Lake Ashi',35.1985,139.0305,'09:00',0,
   'Mt. Fuji decided to show up. Clear morning, not a cloud in sight. The lake is perfectly still.',
   '2026-04-13 09:00:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000002',
   '8268109c-d929-490b-b3de-d48d45571174','visited','activity',
   'Hakone Open Air Museum',35.2509,139.0561,'14:00',1,
   'Sculpture garden with Fuji in the background. The Picasso pavilion alone is worth the trip.',
   '2026-04-13 14:00:00+09'),
  -- Day 3 · Kyoto
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000003',
   '8268109c-d929-490b-b3de-d48d45571174','visited','landmark',
   'Fushimi Inari Taisha',34.9670,135.7727,'06:30',0,
   'Started at dawn to beat the crowds. The torii gates go on forever — we walked for 2 hours and never reached the summit.',
   '2026-04-14 06:30:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000003',
   '8268109c-d929-490b-b3de-d48d45571174','visited','food',
   'Nishiki Market',35.0090,135.7674,'12:30',1,
   'The tamago was unreal. So was the matcha soft serve. Walked the full 400m stretch twice.',
   '2026-04-14 12:30:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000003',
   '8268109c-d929-490b-b3de-d48d45571174','visited','landmark',
   'Arashiyama Bamboo Grove',35.0161,135.6726,'17:00',2,
   'Go late afternoon when the light filters through sideways. The sound of bamboo in the wind is something else.',
   '2026-04-14 17:00:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000003',
   '8268109c-d929-490b-b3de-d48d45571174','visited','hotel',
   'Kyoto Machiya Ryokan',35.0036,135.7634,'21:00',9,
   'Traditional machiya near Nishiki.',
   '2026-04-14 21:00:00+09'),
  -- Day 4 · Osaka
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000004',
   '8268109c-d929-490b-b3de-d48d45571174','visited','landmark',
   'Dotonbori Canal',34.6687,135.5023,'11:00',0,
   'The Glico man sign, takoyaki at every corner, neon everywhere. Osaka has zero chill and I love it.',
   '2026-04-15 11:00:00+09'),
  ('aaaa0001-0000-0000-0000-000000000001','dddd0001-0000-0000-0000-000000000004',
   '8268109c-d929-490b-b3de-d48d45571174','visited','food',
   'Kuromon Ichiba Market',34.6691,135.5130,'20:00',1,
   'A5 wagyu on a stick for ฿180. I had three.',
   '2026-04-15 20:00:00+09');

-- ── 4. Trip 2: 5 Days in Chiang Mai (wanwisa) ───────────────────────
insert into public.trips
  (id, user_id, title, description, status, visibility, start_date, end_date)
values
  ('aaaa0002-0000-0000-0000-000000000002',
   '3cc12b01-1308-46c9-b58e-783eb5a31162',
   '5 Days in Chiang Mai', 'Old city temples + Doi Inthanon',
   'completed', 'public', '2026-03-08', '2026-03-12');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('dddd0002-0000-0000-0000-000000000001','aaaa0002-0000-0000-0000-000000000002',1,'Chiang Mai Old City','2026-03-08'),
  ('dddd0002-0000-0000-0000-000000000002','aaaa0002-0000-0000-0000-000000000002',2,'Doi Inthanon',       '2026-03-09');

insert into public.stops
  (trip_id, day_id, user_id, status, category,
   location_name, latitude, longitude,
   planned_time, sort_order, caption, captured_at)
values
  ('aaaa0002-0000-0000-0000-000000000002','dddd0002-0000-0000-0000-000000000001',
   '3cc12b01-1308-46c9-b58e-783eb5a31162','visited','landmark',
   'Wat Phra Singh',18.7920,98.9888,'09:00',0,
   'Lanna-style temple at golden hour. Monks were chanting inside — we sat outside and just listened.',
   '2026-03-08 09:00:00+07'),
  ('aaaa0002-0000-0000-0000-000000000002','dddd0002-0000-0000-0000-000000000001',
   '3cc12b01-1308-46c9-b58e-783eb5a31162','visited','activity',
   'Sunday Walking Street',18.7876,99.0007,'19:00',1,
   'Stretches for 1km. Street food, hill tribe crafts, a monk doing sand mandalas.',
   '2026-03-08 19:00:00+07'),
  ('aaaa0002-0000-0000-0000-000000000002','dddd0002-0000-0000-0000-000000000002',
   '3cc12b01-1308-46c9-b58e-783eb5a31162','visited','landmark',
   'Doi Inthanon National Park',18.5867,98.5867,'07:00',0,
   'Highest point in Thailand — 2,565m. Cold enough for a jacket. The mist rolls through the pine trees.',
   '2026-03-09 07:00:00+07'),
  ('aaaa0002-0000-0000-0000-000000000002','dddd0002-0000-0000-0000-000000000002',
   '3cc12b01-1308-46c9-b58e-783eb5a31162','visited','landmark',
   'Wachirathan Waterfall',18.5561,98.5834,'11:30',1,
   'Most powerful waterfall in the park. You can feel the spray from 50 meters away.',
   '2026-03-09 11:30:00+07');

-- ── 5. Trip 3: Tokyo Ramen Tour (ploy) ───────────────────────────────
insert into public.trips
  (id, user_id, title, description, status, visibility, start_date, end_date)
values
  ('aaaa0003-0000-0000-0000-000000000003',
   '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f',
   'Tokyo Ramen Tour', 'Four days, one mission: ramen',
   'completed', 'public', '2026-02-20', '2026-02-23');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('dddd0003-0000-0000-0000-000000000001','aaaa0003-0000-0000-0000-000000000003',1,'Shinjuku',          '2026-02-20'),
  ('dddd0003-0000-0000-0000-000000000002','aaaa0003-0000-0000-0000-000000000003',2,'Shibuya & Harajuku','2026-02-21');

insert into public.stops
  (trip_id, day_id, user_id, status, category,
   location_name, latitude, longitude,
   planned_time, sort_order, caption, captured_at)
values
  ('aaaa0003-0000-0000-0000-000000000003','dddd0003-0000-0000-0000-000000000001',
   '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f','visited','food',
   'Fuunji — Tsukemen',35.6926,139.7017,'12:00',0,
   'Queue was 45 min. The dipping ramen broth is so thick it coats the noodles like sauce. Worth every minute.',
   '2026-02-20 12:00:00+09'),
  ('aaaa0003-0000-0000-0000-000000000003','dddd0003-0000-0000-0000-000000000001',
   '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f','visited','food',
   'Ichiran Ramen',35.6903,139.7000,'19:00',1,
   'Solo booths, no eye contact required — just you and the tonkotsu. Peak introvert dining.',
   '2026-02-20 19:00:00+09'),
  ('aaaa0003-0000-0000-0000-000000000003','dddd0003-0000-0000-0000-000000000002',
   '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f','visited','food',
   'Afuri — Yuzu Shio',35.6595,139.6990,'11:00',0,
   'Light, citrusy, completely different from Fuunji yesterday. The yuzu fragrance hits you first.',
   '2026-02-21 11:00:00+09'),
  ('aaaa0003-0000-0000-0000-000000000003','dddd0003-0000-0000-0000-000000000002',
   '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f','visited','food',
   'Nakiryu — Tantanmen',35.7289,139.7290,'15:00',1,
   'Michelin star ramen. The sesame paste broth with sichuan pepper hits different.',
   '2026-02-21 15:00:00+09');

-- ── 6. Likes (so counts are non-zero) ────────────────────────────────
insert into public.likes (user_id, stop_id)
select '3cc12b01-1308-46c9-b58e-783eb5a31162', id
from public.stops where trip_id = 'aaaa0001-0000-0000-0000-000000000001'
  and status = 'visited' and category != 'hotel' and category != 'flight'
limit 5;

insert into public.likes (user_id, stop_id)
select '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f', id
from public.stops where trip_id = 'aaaa0001-0000-0000-0000-000000000001'
  and status = 'visited' and category != 'hotel' and category != 'flight'
limit 3;
