// Re-seeds the 3 test users (bcrypt-hashed passwords, original UUIDs) plus a
// trip each. somchai's Japan trip is structured to exercise skim-fork:
//   - day 2 holds ONLY a hotel  → skim drops it → empty day removed
//   - day 1 has flight + hotel  → skim drops those, keeps food + landmark
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeFeedEligible } from '../src/modules/stops/feed-eligibility';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

const SOMCHAI = '8268109c-d929-490b-b3de-d48d45571174';
const WANWISA = '3cc12b01-1308-46c9-b58e-783eb5a31162';
const PLOY = '3c7c71f3-3855-4f9c-84e9-5c9eb1a6648f';

const USERS = [
  { id: SOMCHAI, email: 'somchai@trailr.app', username: 'somchai.travels', display_name: 'Somchai', real_name: 'Somchai Saetang', phone: '+66 81 234 5678' },
  { id: WANWISA, email: 'wanwisa@trailr.app', username: 'wanwisa.wanders', display_name: 'Wanwisa', real_name: 'Wanwisa Phokin', phone: '+66 89 555 0142' },
  { id: PLOY, email: 'ploy@trailr.app', username: 'ploy.eats', display_name: 'Ploy', real_name: 'Pornploy In-on', phone: '+66 86 777 9921' },
];

const JAPAN = 'aaaa0001-0000-0000-0000-000000000001';
const CHIANGMAI = 'aaaa0002-0000-0000-0000-000000000002';
const RAMEN = 'aaaa0003-0000-0000-0000-000000000003';
const OSAKA = 'aaaa0004-0000-0000-0000-000000000004'; // collaborative (somchai + wanwisa)

type SeedStop = {
  category: string;
  location_name: string;
  status?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  photos?: number; // number of media rows to attach (for album testing)
};
type SeedDay = { day_number: number; place: string; date: string; stops: SeedStop[] };

async function seedTrip(opts: {
  id: string;
  userId: string;
  title: string;
  startDate?: string;
  endDate?: string;
  liveMode?: boolean;
  trail?: Array<{ latitude: number; longitude: number }>;
  days: SeedDay[];
}) {
  // idempotent: clear this trip's batches + stops + days + trail, then recreate
  await prisma.liveBatch.deleteMany({ where: { trip_id: opts.id } });
  await prisma.stop.deleteMany({ where: { trip_id: opts.id } });
  await prisma.tripDay.deleteMany({ where: { trip_id: opts.id } });
  await prisma.trailPoint.deleteMany({ where: { trip_id: opts.id } });

  const tripFields = {
    title: opts.title,
    visibility: 'public',
    status: 'active',
    live_mode: opts.liveMode ?? false,
    fork_count: 0, // reset (test forks may have bumped it)
    start_date: opts.startDate ? new Date(opts.startDate) : null,
    end_date: opts.endDate ? new Date(opts.endDate) : null,
  };
  await prisma.trip.upsert({
    where: { id: opts.id },
    update: tripFields,
    create: { id: opts.id, user_id: opts.userId, ...tripFields },
  });

  if (opts.trail && opts.trail.length > 0) {
    await prisma.trailPoint.createMany({
      data: opts.trail.map((p) => ({
        trip_id: opts.id,
        user_id: opts.userId,
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    });
  }

  for (const day of opts.days) {
    const created = await prisma.tripDay.create({
      data: { trip_id: opts.id, day_number: day.day_number, place: day.place, date: new Date(day.date) },
    });
    for (let i = 0; i < day.stops.length; i++) {
      const s = day.stops[i];
      const stop = await prisma.stop.create({
        data: {
          trip_id: opts.id,
          day_id: created.id,
          user_id: opts.userId,
          status: s.status ?? 'planned',
          category: s.category,
          location_name: s.location_name,
          caption: s.caption,
          captured_at: s.status === 'visited' ? new Date(day.date) : undefined,
          latitude: s.latitude,
          longitude: s.longitude,
          sort_order: i,
        },
      });
      if (s.photos && s.photos > 0) {
        await prisma.media.createMany({
          data: Array.from({ length: s.photos }, (_, j) => {
            // real, loadable demo images (deterministic per media)
            const photo = `https://picsum.photos/seed/${stop.id.slice(0, 8)}-${j}/800/600`;
            return {
              trip_id: opts.id,
              stop_id: stop.id,
              user_id: opts.userId,
              type: 'photo',
              url: photo,
              cdn_url: photo,
              sort_order: j,
            };
          }),
        });
      }
    }
  }
}

/**
 * A collaborative planning trip (somchai owner + wanwisa accepted member) that
 * exercises block scope (assigned stops), budget "Your Share", settle-up
 * (mixed payers), and the photo pool (shared + private, two uploaders).
 */
async function seedCollabTrip() {
  // idempotent reset
  await prisma.media.deleteMany({ where: { trip_id: OSAKA } });
  await prisma.stop.deleteMany({ where: { trip_id: OSAKA } });
  await prisma.tripDay.deleteMany({ where: { trip_id: OSAKA } });
  await prisma.tripMember.deleteMany({ where: { trip_id: OSAKA } });
  await prisma.tripMessage.deleteMany({ where: { trip_id: OSAKA } });

  const tripFields = {
    title: 'Osaka Weekend',
    destination: 'Osaka',
    visibility: 'public',
    status: 'active',
    stage: 'planning', // opens in the builder (where the settle-up UI lives)
    budget: 30000,
    budget_currency: 'THB',
    fork_count: 0,
    start_date: new Date('2026-07-18'),
    end_date: new Date('2026-07-20'),
  };
  await prisma.trip.upsert({
    where: { id: OSAKA },
    update: tripFields,
    create: { id: OSAKA, user_id: SOMCHAI, ...tripFields },
  });

  // wanwisa is an accepted collaborator (owner somchai is implicit, no row needed)
  await prisma.tripMember.create({
    data: { trip_id: OSAKA, user_id: WANWISA, role: 'editor', status: 'accepted', invited_by: SOMCHAI, responded_at: new Date() },
  });

  const day = await prisma.tripDay.create({
    data: { trip_id: OSAKA, day_number: 1, place: 'Osaka', date: new Date('2026-07-18') },
  });

  // scope 'shared' → split across both; 'assigned' → only the listed assignees owe.
  // paid_by → who fronted the cost (drives settle-up).
  const stops: Array<{
    category: string; location_name: string; cost: number;
    scope: 'shared' | 'assigned'; assignees: string[]; paid_by: string;
  }> = [
    { category: 'flight', location_name: 'Kansai Airport — group flights', cost: 12000, scope: 'shared', assignees: [], paid_by: SOMCHAI },
    { category: 'hotel', location_name: 'Namba Oriental Hotel (2 nights)', cost: 8000, scope: 'shared', assignees: [], paid_by: WANWISA },
    { category: 'food', location_name: 'Dotonbori street food crawl', cost: 2000, scope: 'shared', assignees: [], paid_by: SOMCHAI },
    { category: 'activity', location_name: 'Universal Studios Japan', cost: 6000, scope: 'assigned', assignees: [WANWISA], paid_by: WANWISA },
    { category: 'hotel', location_name: 'Capsule night (Somchai)', cost: 1500, scope: 'assigned', assignees: [SOMCHAI], paid_by: SOMCHAI },
  ];
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    await prisma.stop.create({
      data: {
        trip_id: OSAKA, day_id: day.id, user_id: SOMCHAI, status: 'planned',
        category: s.category, location_name: s.location_name, cost: s.cost,
        scope: s.scope, paid_by: s.paid_by, sort_order: i,
        ...(s.assignees.length > 0 ? { assignees: { create: s.assignees.map((uid) => ({ user_id: uid })) } } : {}),
      },
    });
  }

  // Photo pool — trip-level media with no stop, two uploaders, mixed visibility.
  const pool: Array<{ user_id: string; visibility: string; seed: string }> = [
    { user_id: SOMCHAI, visibility: 'shared', seed: 'osaka-castle' },
    { user_id: SOMCHAI, visibility: 'shared', seed: 'osaka-dotonbori' },
    { user_id: WANWISA, visibility: 'shared', seed: 'osaka-usj' },
    { user_id: SOMCHAI, visibility: 'private', seed: 'osaka-selfie' },
  ];
  await prisma.media.createMany({
    data: pool.map((p, j) => {
      const url = `https://picsum.photos/seed/${p.seed}/800/600`;
      return { trip_id: OSAKA, stop_id: null, user_id: p.user_id, type: 'photo', visibility: p.visibility, url, cdn_url: url, sort_order: j };
    }),
  });

  // A short chat thread (created_at spaced so order is stable).
  const base = new Date('2026-06-15T09:00:00Z').getTime();
  const chat: Array<{ user_id: string; body: string }> = [
    { user_id: SOMCHAI, body: 'Booked our group flights to Kansai ✈️ paid for both, settle later!' },
    { user_id: WANWISA, body: 'Nice! I grabbed the Namba hotel for 2 nights then 🙌' },
    { user_id: WANWISA, body: 'I really wanna do Universal Studios — adding it just for me' },
    { user_id: SOMCHAI, body: 'Go for it. I might skip and do a capsule night instead 😴' },
  ];
  await prisma.tripMessage.createMany({
    data: chat.map((m, i) => ({ trip_id: OSAKA, user_id: m.user_id, body: m.body, created_at: new Date(base + i * 60000) })),
  });
}

async function main() {
  // clear any non-canonical trips from prior runs (forks, test drafts) — cascades their stops/days
  await prisma.trip.deleteMany({ where: { id: { notIn: [JAPAN, CHIANGMAI, RAMEN, OSAKA] } } });

  const password_hash = await bcrypt.hash(PASSWORD, 10);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, username: u.username, display_name: u.display_name, real_name: u.real_name, phone: u.phone, password_hash },
      create: { ...u, password_hash, language: 'th' },
    });
  }

  // somchai follows wanwisa + ploy; wanwisa follows somchai (so somchai's feed has content too)
  const followPairs = [
    [SOMCHAI, WANWISA],
    [SOMCHAI, PLOY],
    [WANWISA, SOMCHAI],
  ];
  await prisma.notification.deleteMany({});
  await prisma.follow.deleteMany({});
  for (const [f, t] of followPairs) {
    await prisma.follow.create({ data: { follower_id: f, following_id: t } });
  }
  // keep denormalized counts consistent with the seeded follow graph
  for (const u of USERS) {
    const following_count = await prisma.follow.count({ where: { follower_id: u.id } });
    const follower_count = await prisma.follow.count({ where: { following_id: u.id } });
    await prisma.user.update({ where: { id: u.id }, data: { following_count, follower_count } });
  }

  await seedTrip({
    id: JAPAN,
    userId: SOMCHAI,
    title: '7 Days in Japan',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    liveMode: true, // currently traveling → feed-eligible
    // recorded GPS trail (near each real visited stop); used by the 1km feed gate
    trail: [
      { latitude: 35.6595, longitude: 139.7005 }, // Ichiran
      { latitude: 35.7148, longitude: 139.7967 }, // Senso-ji
      { latitude: 35.0051, longitude: 135.7649 }, // Nishiki
      { latitude: 34.9671, longitude: 135.7727 }, // Fushimi
    ],
    days: [
      {
        day_number: 1,
        place: 'Tokyo',
        date: '2026-06-01',
        stops: [
          { category: 'flight', location_name: 'Narita Airport arrival' },
          { category: 'hotel', location_name: 'Shinjuku Granbell Hotel' },
          { category: 'food', location_name: 'Ichiran Ramen', status: 'visited', caption: 'ราเมนเด็ด!', latitude: 35.6595, longitude: 139.7005, photos: 2 },
          { category: 'landmark', location_name: 'Senso-ji Temple', status: 'visited', caption: 'วัดสวยมาก', latitude: 35.7148, longitude: 139.7967, photos: 3 },
          // Far from the trail (Bangkok) → should be EXCLUDED from feed by the 1km rule.
          { category: 'food', location_name: 'Off-trail test (Bangkok)', status: 'visited', caption: 'should NOT appear in feed', latitude: 13.7563, longitude: 100.5018, photos: 1 },
        ],
      },
      {
        day_number: 2,
        place: 'Tokyo',
        date: '2026-06-02',
        // logistics-only day → skim removes the hotel → empty day dropped
        stops: [{ category: 'hotel', location_name: 'Shinjuku Granbell Hotel (night 2)' }],
      },
      {
        day_number: 3,
        place: 'Kyoto',
        date: '2026-06-04',
        stops: [
          { category: 'transport', location_name: 'Shinkansen to Kyoto' },
          { category: 'food', location_name: 'Nishiki Market', status: 'visited', caption: 'ตลาดอาหาร', latitude: 35.0051, longitude: 135.7649, photos: 2 },
          { category: 'activity', location_name: 'Fushimi Inari hike', status: 'visited', caption: 'ประตูแดงพันบาน', latitude: 34.9671, longitude: 135.7727, photos: 4 },
        ],
      },
    ],
  });

  await seedTrip({
    id: CHIANGMAI,
    userId: WANWISA,
    title: '5 Days in Chiang Mai',
    startDate: '2026-05-26',
    endDate: '2026-05-30', // within the 14-day edit grace of "today" (2026-06-05)
    // no trail recorded → spatial check skipped (temporal-only fallback)
    days: [
      {
        day_number: 1,
        place: 'Chiang Mai',
        date: '2026-05-26',
        stops: [{ category: 'food', location_name: 'Khao Soi Mae Sai', status: 'visited', caption: 'ข้าวซอยอร่อย', latitude: 18.7972, longitude: 98.9787, photos: 1 }],
      },
    ],
  });

  await seedTrip({
    id: RAMEN,
    userId: PLOY,
    title: 'Tokyo Ramen Tour',
    startDate: '2026-05-31',
    endDate: '2026-06-02', // within grace
    days: [
      {
        day_number: 1,
        place: 'Tokyo',
        date: '2026-05-31',
        stops: [{ category: 'food', location_name: 'Afuri Ramen', status: 'visited', caption: 'ยูซุราเมน', latitude: 35.6465, longitude: 139.7100, photos: 1 }],
      },
    ],
  });

  await seedCollabTrip();

  // Compute feed-eligibility for every visited stop (same rule the API uses).
  const visited = await prisma.stop.findMany({
    where: { status: 'visited' },
    select: { id: true, status: true, latitude: true, longitude: true, trip_id: true, user_id: true },
  });
  for (const s of visited) {
    const trip = await prisma.trip.findUnique({
      where: { id: s.trip_id },
      select: { start_date: true, end_date: true, live_mode: true },
    });
    const author = await prisma.user.findUnique({ where: { id: s.user_id }, select: { account_type: true } });
    const trail = await prisma.trailPoint.findMany({ where: { trip_id: s.trip_id }, select: { latitude: true, longitude: true } });
    const eligible = computeFeedEligible({
      status: s.status,
      latitude: s.latitude,
      longitude: s.longitude,
      startDate: trip?.start_date ?? null,
      endDate: trip?.end_date ?? null,
      liveMode: trip?.live_mode ?? false,
      accountType: author?.account_type ?? 'personal',
      trail,
      now: new Date(),
    });
    await prisma.stop.update({ where: { id: s.id }, data: { feed_eligible: eligible } });
  }

  // somchai bookmarks wanwisa's Chiang Mai trip + ploy's Afuri stop
  await prisma.savedItem.deleteMany({});
  const afuri = await prisma.stop.findFirst({
    where: { trip_id: RAMEN, location_name: 'Afuri Ramen' },
    select: { id: true },
  });
  await prisma.savedItem.create({ data: { user_id: SOMCHAI, trip_id: CHIANGMAI } });
  if (afuri) await prisma.savedItem.create({ data: { user_id: SOMCHAI, stop_id: afuri.id } });

  console.log('Seeded 3 users (password: ' + PASSWORD + '), 3 follows, 4 trips (incl. 1 collaborative), trail + feed-eligibility + saved.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
