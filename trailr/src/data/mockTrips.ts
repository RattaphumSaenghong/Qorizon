export interface Moment {
  id?: string; // owning stop id — links a card to its map pin
  time: string;
  location: string;
  caption: string;
  latitude: number;
  longitude: number;
  hasAudio?: boolean;
  audioLabel?: string;
  hasVideo?: boolean;
  photoHeight: number;
  photoUrl?: string;
}

export interface Day {
  n: number;
  place: string;
  date: string;
  moments: Moment[];
}

export interface Trip {
  id: string;
  ownerId?: string; // trip owner's user id — gates owner-only actions
  title: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  duration: string;
  photoCount: number;
  audioCount: number;
  forkCount: number;
  likeCount: number;
  coverLocation: string;
  startDate: string;
  /** Bounding center for the trip map */
  centerLat: number;
  centerLon: number;
  centerZoom: number;
  days: Day[];
  forkedFrom?: string;
}

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-001',
    title: '7 Days in Japan',
    author: 'Somchai Rattana',
    authorHandle: '@somchai.travels',
    duration: '7 days',
    photoCount: 84,
    audioCount: 6,
    forkCount: 24,
    likeCount: 1204,
    coverLocation: 'Tokyo · Japan',
    startDate: 'Apr 2026',
    centerLat: 35.4,
    centerLon: 136.8,
    centerZoom: 6,
    days: [
      {
        n: 1,
        place: 'Tokyo',
        date: 'Apr 12',
        moments: [
          {
            time: '8:40',
            location: 'Tsukiji Outer Market',
            caption: 'Best tuna sashimi at 8am. The market opens early but the energy is unreal — fishermen, chefs, tourists all crammed into tiny alleyways.',
            latitude: 35.6654,
            longitude: 139.7697,
            hasAudio: true,
            audioLabel: 'audio journal · 0:42',
            photoHeight: 200,
          },
          {
            time: '13:10',
            location: 'teamLab Planets',
            caption: 'You walk through knee-deep reflective water into a room of a million flowers. Nothing prepares you for it.',
            latitude: 35.6480,
            longitude: 139.7940,
            hasVideo: true,
            photoHeight: 180,
          },
          {
            time: '19:30',
            location: 'Shibuya Crossing',
            caption: 'Shot this from the Mag\'s Park rooftop. Every time the light turns, ~3,000 people cross at once.',
            latitude: 35.6595,
            longitude: 139.6980,
            photoHeight: 160,
          },
        ],
      },
      {
        n: 2,
        place: 'Hakone',
        date: 'Apr 13',
        moments: [
          {
            time: '9:00',
            location: 'Lake Ashi',
            caption: 'Mt. Fuji decided to show up. Clear morning, not a cloud in sight. The lake is perfectly still.',
            latitude: 35.1985,
            longitude: 139.0305,
            photoHeight: 220,
          },
          {
            time: '14:00',
            location: 'Hakone Open Air Museum',
            caption: 'Sculpture garden with Fuji in the background. The Picasso pavilion alone is worth the trip.',
            latitude: 35.2509,
            longitude: 139.0561,
            hasAudio: true,
            audioLabel: 'voice note · 1:04',
            photoHeight: 160,
          },
        ],
      },
      {
        n: 3,
        place: 'Kyoto',
        date: 'Apr 14',
        moments: [
          {
            time: '6:30',
            location: 'Fushimi Inari Taisha',
            caption: 'Started at dawn to beat the crowds. The torii gates go on forever — we walked for 2 hours and never reached the summit.',
            latitude: 34.9670,
            longitude: 135.7727,
            hasAudio: true,
            audioLabel: 'audio journal · 0:58',
            photoHeight: 240,
          },
          {
            time: '12:30',
            location: 'Nishiki Market',
            caption: 'The tamago was unreal. So was the matcha soft serve. Walked the full 400m stretch twice.',
            latitude: 35.0090,
            longitude: 135.7674,
            photoHeight: 160,
          },
          {
            time: '17:00',
            location: 'Arashiyama Bamboo Grove',
            caption: 'Go late afternoon when the light filters through sideways. The sound of the bamboo in the wind is something else.',
            latitude: 35.0161,
            longitude: 135.6726,
            hasVideo: true,
            photoHeight: 180,
          },
        ],
      },
      {
        n: 4,
        place: 'Osaka',
        date: 'Apr 15',
        moments: [
          {
            time: '11:00',
            location: 'Dotonbori Canal',
            caption: 'The Glico man sign, takoyaki at every corner, neon everywhere. Osaka has zero chill and I love it.',
            latitude: 34.6687,
            longitude: 135.5023,
            photoHeight: 200,
          },
          {
            time: '20:00',
            location: 'Kuromon Ichiba Market',
            caption: 'Night market — A5 wagyu on a stick for ฿180. I had three.',
            latitude: 34.6691,
            longitude: 135.5130,
            hasAudio: true,
            audioLabel: 'voice note · 0:31',
            photoHeight: 160,
          },
        ],
      },
    ],
  },
  {
    id: 'trip-002',
    title: '5 Days in Chiang Mai',
    author: 'Wanwisa Prom',
    authorHandle: '@wanwisa.wanders',
    duration: '5 days',
    photoCount: 62,
    audioCount: 3,
    forkCount: 11,
    likeCount: 876,
    coverLocation: 'Wat Chedi Luang · Chiang Mai',
    startDate: 'Mar 2026',
    centerLat: 18.79,
    centerLon: 98.98,
    centerZoom: 11,
    days: [
      {
        n: 1,
        place: 'Chiang Mai Old City',
        date: 'Mar 8',
        moments: [
          {
            time: '9:00',
            location: 'Wat Phra Singh',
            caption: 'The Lanna-style temple at golden hour. Monks were chanting inside — we sat outside and just listened.',
            latitude: 18.7920,
            longitude: 98.9888,
            photoHeight: 220,
          },
          {
            time: '19:00',
            location: 'Sunday Walking Street',
            caption: 'Stretches for 1km. Street food, hill tribe crafts, a monk doing sand mandalas.',
            latitude: 18.7876,
            longitude: 99.0007,
            hasAudio: true,
            audioLabel: 'audio journal · 1:12',
            photoHeight: 180,
          },
        ],
      },
      {
        n: 2,
        place: 'Doi Inthanon',
        date: 'Mar 9',
        moments: [
          {
            time: '7:00',
            location: 'Doi Inthanon National Park',
            caption: 'Highest point in Thailand — 2,565m. Cold enough for a jacket. The mist rolls through the pine trees.',
            latitude: 18.5867,
            longitude: 98.5867,
            photoHeight: 240,
          },
          {
            time: '11:30',
            location: 'Wachirathan Waterfall',
            caption: 'Most powerful waterfall in the park. You can feel the spray from 50 meters away.',
            latitude: 18.5561,
            longitude: 98.5834,
            hasVideo: true,
            photoHeight: 180,
          },
        ],
      },
    ],
  },
  {
    id: 'trip-003',
    title: 'Tokyo Ramen Tour',
    author: 'Khun Ploy',
    authorHandle: '@ploy.eats',
    duration: '4 days',
    photoCount: 41,
    audioCount: 1,
    forkCount: 37,
    likeCount: 2103,
    coverLocation: 'Fuunji · Shinjuku',
    startDate: 'Feb 2026',
    centerLat: 35.69,
    centerLon: 139.70,
    centerZoom: 13,
    forkedFrom: '@ramen.otaku',
    days: [
      {
        n: 1,
        place: 'Shinjuku',
        date: 'Feb 20',
        moments: [
          {
            time: '12:00',
            location: 'Fuunji — Tsukemen',
            caption: 'Queue was 45 min. The dipping ramen broth is so thick it coats the noodles like sauce. Worth every minute.',
            latitude: 35.6926,
            longitude: 139.7017,
            photoHeight: 200,
          },
          {
            time: '19:00',
            location: 'Ichiran Ramen',
            caption: 'Solo booths, no eye contact required — just you and the tonkotsu. Peak introvert dining.',
            latitude: 35.6903,
            longitude: 139.7000,
            hasAudio: true,
            audioLabel: 'voice note · 0:28',
            photoHeight: 160,
          },
        ],
      },
      {
        n: 2,
        place: 'Shibuya & Harajuku',
        date: 'Feb 21',
        moments: [
          {
            time: '11:00',
            location: 'Afuri — Yuzu Shio',
            caption: 'Light, citrusy, completely different from Fuunji yesterday. The yuzu fragrance hits you first.',
            latitude: 35.6595,
            longitude: 139.6990,
            photoHeight: 180,
          },
          {
            time: '15:00',
            location: 'Nakiryu — Tantanmen',
            caption: 'Michelin star ramen. The sesame paste broth with sichuan pepper hits different.',
            latitude: 35.7289,
            longitude: 139.7290,
            photoHeight: 200,
          },
        ],
      },
    ],
  },
];

export function getTripById(id: string): Trip | undefined {
  return MOCK_TRIPS.find((t) => t.id === id);
}

/** Flatten all moments across all trips into a feed-ready list */
export interface FeedMoment {
  tripId: string;
  tripTitle: string;
  authorHandle: string;
  location: string;
  caption: string;
  latitude: number;
  longitude: number;
  hasVideo?: boolean;
}

export function getAllMoments(): FeedMoment[] {
  return MOCK_TRIPS.flatMap((trip) =>
    trip.days.flatMap((day) =>
      day.moments.map((m) => ({
        tripId: trip.id,
        tripTitle: trip.title,
        authorHandle: trip.authorHandle,
        location: m.location,
        caption: m.caption,
        latitude: m.latitude,
        longitude: m.longitude,
        hasVideo: m.hasVideo,
      }))
    )
  );
}
