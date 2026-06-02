-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Trailr — Seed data                                                ║
-- ║  Mirrors src/data/mockTrips.ts so the DB-backed app shows the      ║
-- ║  same content as the current mock. Run via `supabase db reset`.    ║
-- ║                                                                    ║
-- ║  Creates 3 auth users (password: password123) → trigger makes      ║
-- ║  their profiles → we set nice handles → trips/days/stops.          ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Auth users (fixed ids so we can reference them) ──────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','somchai@trailr.app', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Somchai Rattana"}', false),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','wanwisa@trailr.app', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Wanwisa Prom"}', false),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333','authenticated','authenticated','ploy@trailr.app',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Khun Ploy"}', false);

-- Trigger handle_new_user() already created public.users rows.
-- Override the auto-generated handles / bios.
update public.users set username='somchai.travels', display_name='Somchai Rattana',
  bio=E'Chasing temples, noodles, and mountain roads \xF0\x9F\x8F\x94\nBased in Bangkok'
  where id='11111111-1111-1111-1111-111111111111';
update public.users set username='wanwisa.wanders', display_name='Wanwisa Prom',
  bio='Slow travel, hill tribes, mountain air.'
  where id='22222222-2222-2222-2222-222222222222';
update public.users set username='ploy.eats', display_name='Khun Ploy',
  bio='I travel for the food. Mostly ramen.'
  where id='33333333-3333-3333-3333-333333333333';

-- ── Social graph ─────────────────────────────────────────────────────
insert into public.follows (follower_id, following_id) values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333'),
  ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111');

-- ── Trip 1: 7 Days in Japan (@somchai) ───────────────────────────────
insert into public.trips (id, user_id, title, description, status, visibility, start_date, end_date)
values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  '7 Days in Japan','Tokyo → Hakone → Kyoto → Osaka','completed','public','2026-04-12','2026-04-18');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('d0000001-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',1,'Tokyo','2026-04-12'),
  ('d0000001-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001',2,'Hakone','2026-04-13'),
  ('d0000001-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001',3,'Kyoto','2026-04-14'),
  ('d0000001-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001',4,'Osaka','2026-04-15');

insert into public.stops
  (trip_id, day_id, user_id, status, location_name, latitude, longitude, planned_time, sort_order, caption, captured_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','visited','Tsukiji Outer Market',35.6654,139.7697,'08:40',0,'Best tuna sashimi at 8am. The market opens early but the energy is unreal.','2026-04-12 08:40+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','visited','teamLab Planets',35.6480,139.7940,'13:10',1,'Knee-deep reflective water into a room of a million flowers.','2026-04-12 13:10+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','visited','Shibuya Crossing',35.6595,139.6980,'19:30',2,'Shot from the Mags Park rooftop. ~3,000 people cross at once.','2026-04-12 19:30+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','visited','Lake Ashi',35.1985,139.0305,'09:00',0,'Mt. Fuji decided to show up. Not a cloud in sight.','2026-04-13 09:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','visited','Hakone Open Air Museum',35.2509,139.0561,'14:00',1,'Sculpture garden with Fuji in the background.','2026-04-13 14:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','visited','Fushimi Inari Taisha',34.9670,135.7727,'06:30',0,'Started at dawn. The torii gates go on forever.','2026-04-14 06:30+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','visited','Nishiki Market',35.0090,135.7674,'12:30',1,'The tamago was unreal. So was the matcha soft serve.','2026-04-14 12:30+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','visited','Arashiyama Bamboo Grove',35.0161,135.6726,'17:00',2,'Late afternoon light filtering through sideways.','2026-04-14 17:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','visited','Dotonbori Canal',34.6687,135.5023,'11:00',0,'Neon everywhere. Osaka has zero chill and I love it.','2026-04-15 11:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','visited','Kuromon Ichiba Market',34.6691,135.5130,'20:00',1,'A5 wagyu on a stick. I had three.','2026-04-15 20:00+09');

-- Logistics stops on Trip 1 (a skim-fork drops these; a full-fork keeps them)
insert into public.stops
  (trip_id, day_id, user_id, status, category, location_name, latitude, longitude, planned_time, sort_order, caption, captured_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','visited','flight','TG660 · BKK → HND',35.5494,139.7798,'06:00',-1,'Red-eye into Haneda.','2026-04-12 06:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','visited','hotel','Shinjuku Granbell Hotel',35.6938,139.7036,'22:00',9,'Base for nights 1–2.','2026-04-12 22:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','visited','hotel','Kyoto Machiya Ryokan',35.0036,135.7634,'21:00',9,'Traditional machiya near Nishiki.','2026-04-14 21:00+09');

-- ── Trip 2: 5 Days in Chiang Mai (@wanwisa) ──────────────────────────
insert into public.trips (id, user_id, title, description, status, visibility, start_date, end_date)
values ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',
  '5 Days in Chiang Mai','Old city temples + Doi Inthanon','completed','public','2026-03-08','2026-03-12');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('d0000002-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',1,'Chiang Mai Old City','2026-03-08'),
  ('d0000002-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',2,'Doi Inthanon','2026-03-09');

insert into public.stops
  (trip_id, day_id, user_id, status, location_name, latitude, longitude, planned_time, sort_order, caption, captured_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000002','d0000002-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','visited','Wat Phra Singh',18.7920,98.9888,'09:00',0,'Lanna-style temple at golden hour.','2026-03-08 09:00+07'),
  ('aaaaaaaa-0000-0000-0000-000000000002','d0000002-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','visited','Sunday Walking Street',18.7876,99.0007,'19:00',1,'1km of street food and hill tribe crafts.','2026-03-08 19:00+07'),
  ('aaaaaaaa-0000-0000-0000-000000000002','d0000002-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','visited','Doi Inthanon National Park',18.5867,98.5867,'07:00',0,'Highest point in Thailand — 2,565m.','2026-03-09 07:00+07'),
  ('aaaaaaaa-0000-0000-0000-000000000002','d0000002-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','visited','Wachirathan Waterfall',18.5561,98.5834,'11:30',1,'Feel the spray from 50 meters away.','2026-03-09 11:30+07');

-- ── Trip 3: Tokyo Ramen Tour (@ploy, forked from @ramen.otaku) ───────
insert into public.trips (id, user_id, title, description, status, visibility, start_date, end_date)
values ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',
  'Tokyo Ramen Tour','Four days, one mission: ramen','completed','public','2026-02-20','2026-02-23');

insert into public.trip_days (id, trip_id, day_number, place, date) values
  ('d0000003-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003',1,'Shinjuku','2026-02-20'),
  ('d0000003-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003',2,'Shibuya & Harajuku','2026-02-21');

insert into public.stops
  (trip_id, day_id, user_id, status, location_name, latitude, longitude, planned_time, sort_order, caption, captured_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000003','d0000003-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','visited','Fuunji — Tsukemen',35.6926,139.7017,'12:00',0,'45 min queue. The dipping broth coats the noodles like sauce.','2026-02-20 12:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000003','d0000003-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','visited','Ichiran Ramen',35.6903,139.7000,'19:00',1,'Solo booths. Peak introvert dining.','2026-02-20 19:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000003','d0000003-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','visited','Afuri — Yuzu Shio',35.6595,139.6990,'11:00',0,'Light, citrusy. The yuzu hits first.','2026-02-21 11:00+09'),
  ('aaaaaaaa-0000-0000-0000-000000000003','d0000003-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','visited','Nakiryu — Tantanmen',35.7289,139.7290,'15:00',1,'Michelin star. Sesame + sichuan pepper broth.','2026-02-21 15:00+09');

-- ── Some likes (so counts are non-zero) ──────────────────────────────
insert into public.likes (user_id, stop_id)
select '22222222-2222-2222-2222-222222222222', id from public.stops
  where trip_id='aaaaaaaa-0000-0000-0000-000000000001' limit 5;
insert into public.likes (user_id, stop_id)
select '33333333-3333-3333-3333-333333333333', id from public.stops
  where trip_id='aaaaaaaa-0000-0000-0000-000000000001' limit 3;
