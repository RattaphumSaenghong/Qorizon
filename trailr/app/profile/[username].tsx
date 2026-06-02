/**
 * User Profile
 * ┌─────────────────────────────────────────────────────┐
 * │  Avatar  Name / handle / bio / stats / follow btn   │
 * ├──────────────────────────────────────────────────────┤
 * │  [Posts]  [Albums]  [Map]                            │
 * ├──────────────────────────────────────────────────────┤
 * │  tab content                                         │
 * └──────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, radius } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Avatar } from '../../src/components/Avatar';
import { Btn } from '../../src/components/Btn';
import { Chip } from '../../src/components/Chip';
import { MapView, MapPin } from '../../src/components/MapView';

// ── Mock profile data ────────────────────────────────────────
const PROFILE = {
  handle: '@somchai.travels',
  displayName: 'Somchai Rattana',
  bio: 'Chasing temples, noodles, and mountain roads 🏔️\nBased in Bangkok · 14 countries · 38 cities',
  postsCount: 142,
  followersCount: 4210,
  followingCount: 312,
  isOwn: false,                 // set true to show "Edit profile"
};

// Mock posts grid — 3-col
const POSTS = Array.from({ length: 18 }, (_, i) => ({ id: String(i) }));

// Mock trips — each is both a plan and a story
const TRIPS = [
  { id: 'trip-001', title: '7 Days in Japan',       days: 7,  photos: 84, forks: 24, live: false, status: 'completed' as const },
  { id: 'trip-002', title: 'Chiang Mai Highlands',  days: 5,  photos: 62, forks: 11, live: false, status: 'completed' as const },
  { id: 'trip-003', title: 'Tokyo Ramen Tour',      days: 4,  photos: 41, forks: 37, live: false, status: 'completed' as const },
  { id: 'a4',       title: 'Bali Slow Travel',      days: 10, photos: 0,  forks: 0,  live: true,  status: 'active'    as const },
  { id: 'a5',       title: 'Pai & Mae Hong Son',    days: 3,  photos: 55, forks: 8,  live: false, status: 'draft'     as const },
];

// Mock travel pins — real coordinates of visited cities
const TRAVEL_PINS = [
  { id: 'bkk',  lat: 13.7563,  lon: 100.5018, label: '🇹🇭' },
  { id: 'cmi',  lat: 18.7883,  lon: 98.9817,  label: '🇹🇭' },
  { id: 'tyo',  lat: 35.6762,  lon: 139.6503, label: '🇯🇵' },
  { id: 'kix',  lat: 34.6937,  lon: 135.5023, label: '🇯🇵' },
  { id: 'kte',  lat: 35.0116,  lon: 135.7681, label: '🇯🇵' },
  { id: 'bali', lat: -8.3405,  lon: 115.0920, label: '🇮🇩' },
  { id: 'sin',  lat: 1.3521,   lon: 103.8198, label: '🇸🇬' },
  { id: 'hkg',  lat: 22.3193,  lon: 114.1694, label: '🇭🇰' },
  { id: 'sel',  lat: 3.1390,   lon: 101.6869, label: '🇲🇾' },
  { id: 'hnm',  lat: 21.0285,  lon: 105.8542, label: '🇻🇳' },
  { id: 'cmb',  lat: 6.9271,   lon: 79.8612,  label: '🇱🇰' },
  { id: 'dxb',  lat: 25.2048,  lon: 55.2708,  label: '🇦🇪' },
  { id: 'lhr',  lat: 51.5074,  lon: -0.1278,  label: '🇬🇧' },
  { id: 'cdg',  lat: 48.8566,  lon: 2.3522,   label: '🇫🇷' },
];

type Tab = 'Posts' | 'Trips' | 'Map';

// ── Bio header ───────────────────────────────────────────────
function ProfileHeader({ onFollow }: { onFollow: () => void }) {
  const [following, setFollowing] = useState(false);

  const handleFollow = () => {
    setFollowing((f) => !f);
    onFollow();
  };

  return (
    <View style={styles.header}>
      <Avatar size={88} ring />

      <View style={styles.headerMeta}>
        {/* name + actions */}
        <View style={styles.nameRow}>
          <View>
            <Text style={styles.displayName}>{PROFILE.displayName}</Text>
            <Text style={styles.handle}>{PROFILE.handle}</Text>
          </View>
          <View style={styles.headerActions}>
            {PROFILE.isOwn ? (
              <Btn sm>Edit profile</Btn>
            ) : (
              <>
                <Btn
                  solid={!following}
                  sm
                  onPress={handleFollow}
                  style={following ? styles.followingBtn : undefined}
                >
                  {following ? 'Following' : 'Follow'}
                </Btn>
                <Btn sm>Message</Btn>
              </>
            )}
          </View>
        </View>

        {/* stats */}
        <View style={styles.stats}>
          <StatPill value={PROFILE.postsCount} label="posts" />
          <View style={styles.statDivider} />
          <StatPill value={PROFILE.followersCount.toLocaleString()} label="followers" />
          <View style={styles.statDivider} />
          <StatPill value={PROFILE.followingCount} label="following" />
        </View>

        {/* bio */}
        <Text style={styles.bio}>{PROFILE.bio}</Text>
      </View>
    </View>
  );
}

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Tab bar ──────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: Tab[] = ['Posts', 'Trips', 'Map'];
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tabItem, active === t && styles.tabItemActive]}
          onPress={() => onChange(t)}
        >
          <Text style={[styles.tabLabel, active === t && styles.tabLabelActive]}>
            {t === 'Posts' ? '⊞  Posts' : t === 'Trips' ? '✈  Trips' : '◎  Map'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Posts grid ───────────────────────────────────────────────
function PostsGrid({ onPress }: { onPress: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.postsGrid}>
      {POSTS.map((p, i) => (
        <Pressable
          key={p.id}
          style={({ pressed }) => [styles.postCell, pressed && styles.postCellPressed]}
          onPress={() => onPress(p.id)}
        >
          {/* placeholder — will be a CDN image */}
          <View style={styles.postPhoto}>
            {i === 0 && <Text style={styles.postPhotoLabel}>[ photo ]</Text>}
          </View>
          {/* video indicator on a few */}
          {i % 5 === 2 && (
            <View style={styles.videoTag}>
              <Text style={styles.videoTagText}>▶</Text>
            </View>
          )}
          {/* multi-photo indicator */}
          {i % 4 === 1 && (
            <View style={styles.multiTag}>
              <Text style={styles.multiTagText}>⊞</Text>
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ── Trips grid ───────────────────────────────────────────────
type TripMode = 'story' | 'plan';

function TripCard({
  trip,
  onOpen,
}: {
  trip: typeof TRIPS[0];
  onOpen: (id: string, mode: TripMode) => void;
}) {
  const [mode, setMode] = useState<TripMode>('story');

  const statusColor = trip.status === 'active'
    ? colors.acc
    : trip.status === 'draft'
    ? colors.sub
    : colors.line;

  const statusLabel = trip.status === 'active'
    ? '● LIVE'
    : trip.status === 'draft'
    ? 'Draft'
    : `${trip.days} days`;

  return (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => onOpen(trip.id, mode)}
      activeOpacity={0.88}
    >
      {/* cover */}
      <View style={styles.tripCover}>
        <Text style={styles.tripCoverLabel}>[ cover ]</Text>

        {/* LIVE badge */}
        {trip.live && (
          <View style={styles.livePill}>
            <View style={styles.livePillDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        )}

        {/* Plan ↔ Story toggle — sits bottom of cover */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'story' && styles.modeBtnActive]}
            onPress={(e) => { e.stopPropagation?.(); setMode('story'); }}
          >
            <Text style={[styles.modeBtnText, mode === 'story' && styles.modeBtnTextActive]}>
              Story
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'plan' && styles.modeBtnActive]}
            onPress={(e) => { e.stopPropagation?.(); setMode('plan'); }}
          >
            <Text style={[styles.modeBtnText, mode === 'plan' && styles.modeBtnTextActive]}>
              Plan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* meta */}
      <View style={styles.tripMeta}>
        <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
        <View style={styles.tripFooter}>
          <Text style={[styles.tripStatus, { color: statusColor }]}>{statusLabel}</Text>
          {trip.forks > 0 && (
            <Text style={styles.tripForks}>⑂ {trip.forks}</Text>
          )}
          {trip.photos > 0 && (
            <Text style={styles.tripPhotos}>▦ {trip.photos}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TripsGrid({ onOpen }: { onOpen: (id: string, mode: TripMode) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.tripsGrid}>
      {TRIPS.map((t) => (
        <TripCard key={t.id} trip={t} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

// ── Travel map ───────────────────────────────────────────────
function TravelMap() {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Convert real lat/lng to approximate percentage positions on a
  // world-centered static map (zoom ~2, center 60°E, 20°N).
  // Pins are overlay elements — they're approximate on the static tile
  // but will be geographically accurate once we swap in the interactive SDK.
  const PIN_POSITIONS: Record<string, { x: `${number}%`; y: `${number}%` }> = {
    bkk:  { x: '72%', y: '52%' }, cmi:  { x: '71%', y: '47%' },
    tyo:  { x: '80%', y: '40%' }, kix:  { x: '79%', y: '42%' },
    kte:  { x: '78%', y: '42%' }, bali: { x: '75%', y: '62%' },
    sin:  { x: '74%', y: '58%' }, hkg:  { x: '77%', y: '48%' },
    sel:  { x: '73%', y: '55%' }, hnm:  { x: '76%', y: '50%' },
    cmb:  { x: '68%', y: '58%' }, dxb:  { x: '60%', y: '46%' },
    lhr:  { x: '42%', y: '30%' }, cdg:  { x: '44%', y: '31%' },
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        initialLongitude={80}
        initialLatitude={20}
        initialZoom={2}
        style={styles.travelMap}
      >
        {TRAVEL_PINS.map((pin) => {
          const pos = PIN_POSITIONS[pin.id];
          if (!pos) return null;
          return (
            <TouchableOpacity
              key={pin.id}
              style={[styles.travelPin, { left: pos.x, top: pos.y }]}
              onPress={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
            >
              <Text style={styles.travelPinEmoji}>{pin.label}</Text>
            </TouchableOpacity>
          );
        })}
      </MapView>

      {/* Stats overlay */}
      <View style={styles.mapStats}>
        <Text style={styles.mapStatsText}>14 countries · 38 cities</Text>
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('Posts');

  return (
    <View style={styles.root}>
      <TopBar
        active="Feed"
        onTabPress={(tab) => {
          if (tab === 'Feed') router.push('/(tabs)/');
          if (tab === 'Explore') router.push('/(tabs)/explore');
          if (tab === 'Trips') router.push('/(tabs)/trips');
        }}
      />

      <View style={styles.body}>
        {/* Left column: bio + tabs + content */}
        <View style={styles.leftCol}>
          <ProfileHeader onFollow={() => {}} />
          <TabBar active={activeTab} onChange={setActiveTab} />

          <View style={styles.tabContent}>
            {activeTab === 'Posts' && (
              <PostsGrid onPress={(id) => router.push(`/journal/${id}`)} />
            )}
            {activeTab === 'Trips' && (
              <TripsGrid
                onOpen={(id, mode) =>
                  mode === 'story'
                    ? router.push(`/journal/${id}`)
                    : router.push(`/builder/${id}`)
                }
              />
            )}
            {activeTab === 'Map' && <TravelMap />}
          </View>
        </View>
      </View>
    </View>
  );
}

const CELL_GAP = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, flexDirection: 'column' },
  body: { flex: 1, overflow: 'hidden' },
  leftCol: { flex: 1, flexDirection: 'column' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    gap: spacing.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  headerMeta: { flex: 1, gap: spacing.md },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  displayName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.ink },
  handle: { fontSize: fontSize.md, color: colors.sub, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  followingBtn: { opacity: 0.7 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: fontSize.xs, color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.line },

  bio: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.acc,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.acc,
  },

  tabContent: { flex: 1, overflow: 'hidden' },

  // ── Posts grid ──
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    padding: CELL_GAP,
  },
  postCell: {
    width: `${(100 - CELL_GAP * 4) / 3}%`,
    aspectRatio: 1,
    position: 'relative',
  },
  postCellPressed: { opacity: 0.85 },
  postPhoto: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPhotoLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  videoTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(44,42,38,0.65)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTagText: { fontSize: 10, color: colors.white },
  multiTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(44,42,38,0.65)',
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiTagText: { fontSize: 10, color: colors.white },

  // ── Trips grid ──
  tripsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  tripCard: {
    width: '30%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  tripCover: {
    height: 150,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tripCoverLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  livePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.acc,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  livePillText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '700' },

  // Plan ↔ Story toggle
  modeToggle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(44,42,38,0.55)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 16,
  },
  modeBtnActive: {
    backgroundColor: colors.paper,
  },
  modeBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: 'rgba(251,249,245,0.7)',
  },
  modeBtnTextActive: {
    color: colors.ink,
  },

  tripMeta: { padding: spacing.sm, gap: 4 },
  tripTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  tripFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripStatus: { fontSize: fontSize.xs, fontWeight: '600' },
  tripForks: { fontSize: fontSize.xs, color: colors.sub },
  tripPhotos: { fontSize: fontSize.xs, color: colors.sub },

  // ── Travel map ──
  mapContainer: { flex: 1, position: 'relative' },
  travelMap: { flex: 1 },
  travelPin: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  travelPinEmoji: { fontSize: 14 },
  mapStats: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapStatsText: { fontSize: fontSize.md, fontWeight: '600', color: colors.ink },
});
