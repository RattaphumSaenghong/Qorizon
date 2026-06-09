# TRAILR — Technical Architecture Document
**Version:** 1.0 — Month 1 Design & Architecture Phase  
**Status:** Pre-build. No code written yet.  
**Last updated:** May 2026  
**Figma:** [TRAILR Design File](https://www.figma.com/file/597biXRsfOWGy2FqL8pMlq?node-id=0:1&locale=en&type=design)

---

## 1. Product Overview

Trailr is a travel social platform targeting Thai Gen Z and Millennials (global from day one, marketing in Thailand first). It combines a location-embedded social feed, Canva-style trip blueprint editor, GPS auto-album, live trail mode, and one-click flight + hotel booking — in one product.

**Core emotional positioning:** Warm & personal  
**Primary moat:** First-mover social stickiness in SEA travel content + booking layer  
**GTM strategy:** Japan luxury culinary tour customers as seed user base

---

## 2. Platform Targets

| Platform | Primary Use Case | Framework |
|---|---|---|
| iOS + Android (Mobile) | During-trip — posting, live trail, auto-album | React Native + Expo |
| iPad + Tablet | Planning — trip builder, map view, discovery | React Native + Expo (responsive layout) |
| Web (Browser) | Planning, public trip URLs, SEO, desktop | Next.js |

> **Decision rationale:** Single React Native codebase handles mobile and tablet via responsive layout detection. Tablet layout mirrors the web planning experience. Next.js shares JavaScript/TypeScript knowledge with the React Native team. No Flutter — Mapbox's Flutter SDK is community-maintained and insufficient for Trailr's core map features.

---

## 3. Tech Stack

### 3.1 Frontend — Mobile & Tablet
```
React Native       — Core framework
Expo               — Build tooling, OTA updates, device APIs
Expo Router        — File-based navigation
Mapbox GL RN       — Maps, live trail, location pins (official SDK)
Expo Camera        — Photo + video capture
Expo Location      — GPS tracking, background location
Expo AV            — Audio journal recording + playback
Expo Notifications — Push notification handling
React Query        — Server state, caching, background sync
Zustand            — Local UI state management
i18next            — Thai + English internationalisation
```

### 3.2 Frontend — Web
```
Next.js 14         — App router, SSR, SSG
Mapbox GL JS       — Maps for web (official, fully mature SDK)
Tailwind CSS       — Styling
React Query        — Data fetching, cache
next-i18next       — Thai + English
```

### 3.3 Backend
```
Supabase           — PostgreSQL database, Auth, Storage, Realtime
Supabase Auth      — Email + Google + Apple + Facebook login
Supabase Realtime  — Live trail updates, live location subscriptions
Supabase Storage   — Photos, videos (30s max), audio journals
Supabase Edge Fn   — Serverless functions (booking webhooks, batch jobs)
Cloudflare CDN     — Media delivery, edge caching globally
```

### 3.4 Third-Party Integrations
```
Amadeus API        — Flight search + booking
Agoda API          — Hotel search + booking (affiliate programme)
Booking.com API    — Hotel fallback inventory
Mapbox             — Maps, geocoding, routing, custom tile styling
Expo Push          — Push notification delivery (iOS + Android)
```

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  React Native (iOS/Android/iPad)    Next.js (Web/Browser)   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                     SUPABASE                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth    │  │ Postgres │  │ Realtime │  │  Storage   │  │
│  │          │  │    DB    │  │ (WS)     │  │            │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Edge Functions                          │    │
│  │  booking-webhook  │  batch-album  │  notification   │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│               EXTERNAL APIS                                  │
│   Amadeus (flights)  │  Agoda (hotels)  │  Booking.com      │
│   Mapbox (maps)      │  Expo Push       │  Cloudflare CDN   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Users
```sql
users
  id              uuid PRIMARY KEY
  username        text UNIQUE NOT NULL
  display_name    text
  avatar_url      text
  bio             text
  language        text DEFAULT 'th'        -- 'th' | 'en'
  follower_count  int DEFAULT 0
  following_count int DEFAULT 0
  created_at      timestamptz DEFAULT now()
```

### 5.2 Trips
```sql
trips
  id              uuid PRIMARY KEY
  user_id         uuid REFERENCES users(id)
  title           text NOT NULL
  description     text
  cover_image_url text
  status          text DEFAULT 'draft'     -- 'draft' | 'active' | 'completed'
  live_mode       boolean DEFAULT false
  live_cadence    text DEFAULT 'daily'     -- 'hourly' | 'daily' | 'manual'
  visibility      text DEFAULT 'public'    -- 'public' | 'followers' | 'link_only' | 'private'
  forked_from_id  uuid REFERENCES trips(id)
  fork_count      int DEFAULT 0
  start_date      date
  end_date        date
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
```

### 5.3 Posts
```sql
posts
  id              uuid PRIMARY KEY
  user_id         uuid REFERENCES users(id)
  trip_id         uuid REFERENCES trips(id)
  caption         text
  location_name   text
  latitude        float8
  longitude       float8
  place_id        text                     -- Mapbox place ID
  batch_date      date                     -- which Live Mode batch this belongs to
  like_count      int ; 0
  comment_count   int DEFAULT 0
  created_at      timestamptz DEFAULT now()
```

### 5.4 Media
```sql
media
  id              uuid PRIMARY KEY
  post_id         uuid REFERENCES posts(id)
  user_id         uuid REFERENCES users(id)
  type            text NOT NULL            -- 'photo' | 'video' | 'audio'
  url             text NOT NULL            -- Supabase Storage URL
  cdn_url         text                     -- Cloudflare CDN URL
  latitude        float8                   -- parsed from EXIF if available
  longitude       float8
  captured_at     timestamptz              -- EXIF timestamp
  duration_secs   int                      -- for video/audio
  size_bytes      bigint
  created_at      timestamptz DEFAULT now()
```

### 5.5 Trail Points
```sql
trail_points
  id              uuid PRIMARY KEY
  trip_id         uuid REFERENCES trips(id)
  user_id         uuid REFERENCES users(id)
  latitude        float8 NOT NULL
  longitude       float8 NOT NULL
  altitude        float8
  recorded_at     timestamptz DEFAULT now()

-- Index for efficient trail queries
CREATE INDEX idx_trail_points_trip_id ON trail_points(trip_id, recorded_at);
```

### 5.6 Live Batches
```sql
live_batches
  id              uuid PRIMARY KEY
  trip_id         uuid REFERENCES trips(id)
  batch_date      date NOT NULL
  title           text                     -- auto or user-set "Day 3 — Kyoto"
  post_ids        uuid[]                   -- posts in this batch
  published_at    timestamptz
  notified_at     timestamptz              -- when followers were notified
  created_at      timestamptz DEFAULT now()
```

### 5.7 Social Graph
```sql
follows
  follower_id     uuid REFERENCES users(id)
  following_id    uuid REFERENCES users(id)
  created_at      timestamptz DEFAULT now()
  PRIMARY KEY (follower_id, following_id)

likes
  user_id         uuid REFERENCES users(id)
  post_id         uuid REFERENCES posts(id)
  created_at      timestamptz DEFAULT now()
  PRIMARY KEY (user_id, post_id)

comments
  id              uuid PRIMARY KEY
  user_id         uuid REFERENCES users(id)
  post_id         uuid REFERENCES posts(id)
  content         text NOT NULL
  created_at      timestamptz DEFAULT now()
```

### 5.8 Bookings
```sql
bookings
  id              uuid PRIMARY KEY
  user_id         uuid REFERENCES users(id)
  trip_id         uuid REFERENCES trips(id)
  type            text NOT NULL            -- 'flight' | 'hotel'
  provider        text NOT NULL            -- 'amadeus' | 'agoda' | 'booking_com'
  external_ref    text                     -- provider booking reference
  status          text DEFAULT 'pending'   -- 'pending' | 'confirmed' | 'cancelled'
  amount_thb      numeric(10,2)
  commission_thb  numeric(10,2)
  raw_payload     jsonb                    -- full provider response
  created_at      timestamptz DEFAULT now()
```

### 5.9 Notifications
```sql
notifications
  id              uuid PRIMARY KEY
  user_id         uuid REFERENCES users(id)  -- recipient
  type            text NOT NULL            -- 'live_batch' | 'follow' | 'like' | 'comment'
  actor_id        uuid REFERENCES users(id)
  trip_id         uuid REFERENCES trips(id)
  post_id         uuid REFERENCES posts(id)
  batch_id        uuid REFERENCES live_batches(id)
  read            boolean DEFAULT false
  push_sent       boolean DEFAULT false
  created_at      timestamptz DEFAULT now()
```

---

## 6. Core Features — Technical Approach

### 6.1 Live Trail (Every 30 Seconds)
- Mobile app records GPS coordinates every 30 seconds via `expo-location` background task
- Points written to `trail_points` table via Supabase client
- Public trip page subscribes via **Supabase Realtime** — trail redraws on the map as points arrive
- Twitch stream URL (`trailr.app/trip/:id`) shows live map with no login required
- Battery optimisation: background location uses `LOW_ACCURACY` mode when screen is off, `BALANCED` when active

### 6.2 Live Mode — Batch Publishing
- User sets cadence: hourly / daily / manual
- Supabase Edge Function runs on schedule — groups posts + trail points by `batch_date`
- Creates `live_batch` record, triggers notification to all followers
- Push notification delivered via **Expo Push Notification Service**
- In-app notification created in `notifications` table
- Feed card appears in follower feeds automatically

### 6.3 Auto-Album from GPS Metadata
- On photo upload, app reads EXIF GPS data via `expo-image-picker`
- Coordinates reverse-geocoded via Mapbox API → location name
- Photo auto-assigned to nearest trail segment of active trip
- Album grouped by day + location cluster
- User can reorder, remove, add captions after generation

### 6.4 Trip Forking (Canva Model)
- "Use This Trip" creates a deep copy of `trips` record with `forked_from_id` pointing to original
- All `itinerary_items` copied — user owns their fork independently
- Original creator's `fork_count` incremented
- Fork attribution shown on trip card ("Based on @username's Japan trip")

### 6.5 One-Click Booking
- Flight search → Amadeus Flight Offers Search API
- Hotel search → Agoda Affiliate API (primary) + Booking.com (fallback)
- Booking intent stored in `bookings` table before redirecting to provider
- Affiliate commission tracked via provider webhooks → Supabase Edge Function
- No payment handled in-app — handoff to provider checkout

### 6.6 Guide Live Location (Tour Feature)
- Guide (Zach) shares location on active tour trip
- Tour guests subscribe to guide's `trail_points` in real time via Supabase Realtime
- Displayed as distinct pin on map — "Your guide is here"
- Visibility locked to trip members only

---

## 7. Authentication

**Provider:** Supabase Auth  
**Methods:** Email/password, Google OAuth, Apple Sign-In, Facebook OAuth

| Method | Mobile | Web | Notes |
|---|---|---|---|
| Email + Password | ✅ | ✅ | Default |
| Google | ✅ | ✅ | Required for Android |
| Apple | ✅ | ✅ | Required for iOS App Store |
| Facebook | ✅ | ✅ | Strong in Thai market |

- JWT tokens managed automatically by Supabase client
- Refresh tokens handled client-side
- Row Level Security (RLS) enabled on all tables — users can only read/write their own data unless explicitly public

---

## 8. Media Storage Strategy

| Media Type | Max Size | Storage | Delivery |
|---|---|---|---|
| Photos | 10MB | Supabase Storage | Cloudflare CDN |
| Videos | 30s / ~50MB | Supabase Storage | Cloudflare CDN |
| Audio journals | 5min / ~5MB | Supabase Storage | Cloudflare CDN |

- Photos compressed client-side before upload (max 2048px longest edge)
- Videos transcoded to H.264 via Supabase Edge Function post-upload
- CDN URLs used for all media delivery — direct Supabase Storage URLs never exposed to frontend

---

## 9. Internationalisation

**Languages at launch:** Thai (th) + English (en)  
**Default:** Thai  
**Library:** i18next (mobile), next-i18next (web)

- All UI strings externalised from day one
- Date/time formatted per locale
- Mapbox map labels: language parameter set to match user preference
- Booking APIs return English content — translated UI wrapper handles labels

---

## 10. Infrastructure & Scaling

### 10.1 Supabase Tier Strategy
| Threshold | Action |
|---|---|
| 0 → 500 users | Free tier (500MB DB, 1GB storage, 50k Mapbox loads) |
| 500 users | Auto-upgrade to Supabase Pro ($25/month) |
| 5,000 users | Add Cloudflare R2 for media (cheaper than Supabase storage at scale) |
| 10,000 users | Evaluate read replicas for feed queries |

### 10.2 Mapbox Cost Management
- Free tier: 50,000 map loads/month
- Tile requests cached at CDN layer — users scrolling the same map don't re-fetch
- Trail rendering uses GeoJSON overlays (not additional API calls)
- Geocoding results cached in DB — same place never geocoded twice

### 10.3 Booking API Costs
- Amadeus: Free tier (2,000 API calls/month), paid above that
- Agoda: Free for approved affiliates (revenue share model)
- Booking.com: Free for affiliates
- All booking searches cached for 15 minutes — same search by different users served from cache

---

## 11. Security

- **Row Level Security** on all Supabase tables
- **HTTPS only** — all client-server communication
- **Signed URLs** for media access — no public bucket access
- **API keys** stored in environment variables, never in client bundle
- **Booking webhooks** verified via provider signatures
- **Rate limiting** on auth endpoints via Supabase built-in

---

## 12. Public Trip URL (Twitch Integration)

`trailr.app/trip/:tripId`

- Rendered by Next.js — **server-side rendered** for SEO + fast first load
- No login required to view
- Realtime trail updates via Supabase Realtime subscription on the page
- Shows: live map with trail, today's batch, follower count, "Use This Trip" CTA
- Meta tags optimised for sharing (OG image generated from map screenshot)
- This URL goes in Twitch stream descriptions

---

## 13. Month 1 Deliverables (Design & Architecture Phase)

### Design (Figma — 597biXRsfOWGy2FqL8pMlq)
- [ ] Design system: colours, typography, spacing, components
- [ ] All mobile screens (18+ already started)
- [ ] Live Mode screen + batch card
- [ ] Web/iPad planning layout
- [ ] Public trip URL page
- [ ] Onboarding flow

### Architecture
- [x] Stack decisions finalised
- [x] Database schema designed
- [x] Third-party APIs identified
- [ ] Supabase project created + RLS policies written
- [ ] Repo structure agreed (monorepo vs separate)
- [ ] CI/CD pipeline designed
- [ ] Environment setup (dev / staging / prod)

### Team Alignment
- [ ] Feature ownership assigned across 5 engineers
- [ ] Month 2 sprint plan written
- [ ] Figma dev handoff completed
- [ ] API contracts documented

---

## 14. Team & Ownership

| Role | Area |
|---|---|
| CEO / Designer | Product vision, Figma, revenue, investor relations |
| Frontend Mobile | React Native, Expo, maps |
| Frontend Web | Next.js, public pages, web planning view |
| Backend | Supabase, Edge Functions, booking APIs |
| Full-stack | GPS/trail system, media pipeline, bridges gaps |

---

*This document is the source of truth for all architecture decisions. Update before making any changes to stack or schema.*
