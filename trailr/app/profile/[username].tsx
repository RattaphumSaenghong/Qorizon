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
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  useUserByUsername,
  useUserTrips,
  useUserPosts,
  useIsFollowing,
  useToggleFollow,
  useUpdateUser,
} from '@trailr/db';
import type { TripWithAuthor, StopWithMedia, UserRow } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Avatar } from '../../src/components/Avatar';
import { Btn } from '../../src/components/Btn';
import { Chip } from '../../src/components/Chip';
import { CoverImage } from '../../src/components/CoverImage';
import { MapView } from '../../src/components/MapView';
import { useAuthStore } from '../../src/stores/authStore';
import { signOut } from '../../src/lib/auth';

// Travel pins — placeholder world-map markers (visited-city aggregation is a follow-up)
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
function ProfileHeader({
  profile,
  isOwn,
  onSignOut,
  isFollowing,
  onToggleFollow,
  onEditProfile,
  postsCount,
}: {
  profile: UserRow;
  isOwn: boolean;
  onSignOut: () => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onEditProfile: () => void;
  postsCount: number;
}) {
  return (
    <View style={styles.header}>
      <Avatar size={88} ring imageUri={profile.avatar_url} />

      <View style={styles.headerMeta}>
        {/* name + actions */}
        <View style={styles.nameRow}>
          <View>
            <Text style={styles.displayName}>{profile.display_name ?? profile.username}</Text>
            <Text style={styles.handle}>@{profile.username}</Text>
          </View>
          <View style={styles.headerActions}>
            {isOwn ? (
              <>
                <Btn sm onPress={onEditProfile}>Edit profile</Btn>
                <Btn sm onPress={onSignOut}>Sign out</Btn>
              </>
            ) : (
              <>
                <Btn
                  solid={!isFollowing}
                  sm
                  onPress={onToggleFollow}
                  style={isFollowing ? styles.followingBtn : undefined}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Btn>
                <Btn sm>Message</Btn>
              </>
            )}
          </View>
        </View>

        {/* stats */}
        <View style={styles.stats}>
          <StatPill value={postsCount} label="posts" />
          <View style={styles.statDivider} />
          <StatPill value={profile.follower_count.toLocaleString()} label="followers" />
          <View style={styles.statDivider} />
          <StatPill value={profile.following_count} label="following" />
        </View>

        {/* bio */}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
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
function PostsGrid({ posts, onPress }: { posts: StopWithMedia[]; onPress: (tripId: string) => void }) {
  if (posts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No posts yet.</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.postsGrid}>
      {posts.map((p) => {
        const uri = p.media?.[0]?.cdn_url ?? p.media?.[0]?.url;
        return (
          <Pressable
            key={p.id}
            style={({ pressed }) => [styles.postCell, pressed && styles.postCellPressed]}
            onPress={() => onPress(p.trip_id)}
          >
            <View style={styles.postPhoto}>
              <CoverImage uri={uri} style={styles.postPhotoImg} labelStyle={styles.postPhotoLabel} />
            </View>
            {p.media && p.media.length > 1 && (
              <View style={styles.multiTag}>
                <Text style={styles.multiTagText}>⊞</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Trips grid ───────────────────────────────────────────────
type TripMode = 'story' | 'plan';

function TripCard({
  trip,
  onOpen,
}: {
  trip: TripWithAuthor;
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
    : 'completed';

  return (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => onOpen(trip.id, mode)}
      activeOpacity={0.88}
    >
      {/* cover */}
      <View style={styles.tripCover}>
        <CoverImage
          uri={trip.cover_image_url}
          style={styles.tripCoverImg}
          labelStyle={styles.tripCoverLabel}
          label="cover"
        />

        {/* LIVE badge */}
        {trip.live_mode && (
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
          {trip.fork_count > 0 && (
            <Text style={styles.tripForks}>⑂ {trip.fork_count}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TripsGrid({ trips, onOpen }: { trips: TripWithAuthor[]; onOpen: (id: string, mode: TripMode) => void }) {
  if (trips.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trips yet.</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.tripsGrid}>
      {trips.map((t) => (
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
  const currentUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [activeTab, setActiveTab] = useState<Tab>('Posts');
  const [editOpen, setEditOpen] = useState(false);
  const [edName, setEdName] = useState('');
  const [edBio, setEdBio] = useState('');
  const [edAvatar, setEdAvatar] = useState('');

  // '/profile/me', or viewing your own handle, = own profile
  const isOwn = username === 'me' || (!!currentUser && username === currentUser.username);

  // For other people, fetch by username; own profile uses the auth store.
  const byUsername = useUserByUsername(isOwn ? '' : (username ?? ''));
  const profile: UserRow | null | undefined = isOwn ? currentUser : byUsername.data;

  const tripsQ = useUserTrips(profile?.id ?? '');
  const postsQ = useUserPosts(profile?.id ?? '');
  const followingQ = useIsFollowing(currentUser?.id ?? '', !isOwn && profile ? profile.id : '');
  const toggleFollow = useToggleFollow(currentUser?.id ?? '');
  const updateUser = useUpdateUser(profile?.id ?? '');

  const openEdit = () => {
    if (!profile) return;
    setEdName(profile.display_name ?? '');
    setEdBio(profile.bio ?? '');
    setEdAvatar(profile.avatar_url ?? '');
    setEditOpen(true);
  };
  const saveProfile = () => {
    updateUser.mutate(
      {
        display_name: edName.trim() || undefined,
        bio: edBio,
        avatar_url: edAvatar.trim() || undefined,
      },
      { onSuccess: (u) => { setUser(u); setEditOpen(false); } },
    );
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(tabs)/');
  };
  const handleToggleFollow = () => {
    if (!currentUser) {
      router.push('/sign-in');
      return;
    }
    if (!profile) return;
    toggleFollow.mutate({ targetUserId: profile.id, isFollowing: !!followingQ.data });
  };

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
  };

  if (!profile) {
    return (
      <View style={styles.root}>
        <TopBar active="Feed" onTabPress={goTab} />
        <View style={styles.empty}>
          {isOwn ? (
            <Text style={styles.emptyText}>Sign in to view your profile.</Text>
          ) : (
            <ActivityIndicator color={colors.acc} size="large" />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar active="Feed" onTabPress={goTab} />

      <View style={styles.body}>
        {/* Left column: bio + tabs + content */}
        <View style={styles.leftCol}>
          <ProfileHeader
            profile={profile}
            isOwn={isOwn}
            onSignOut={handleSignOut}
            isFollowing={!!followingQ.data}
            onToggleFollow={handleToggleFollow}
            onEditProfile={openEdit}
            postsCount={postsQ.data?.length ?? 0}
          />
          <TabBar active={activeTab} onChange={setActiveTab} />

          <View style={styles.tabContent}>
            {activeTab === 'Posts' && (
              <PostsGrid posts={postsQ.data ?? []} onPress={(tripId) => router.push(`/journal/${tripId}`)} />
            )}
            {activeTab === 'Trips' && (
              <TripsGrid
                trips={tripsQ.data ?? []}
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

      {/* Edit profile modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            <Text style={styles.modalTitle}>Edit profile</Text>

            <Text style={styles.modalLabel}>Display name</Text>
            <TextInput style={styles.input} value={edName} onChangeText={setEdName} placeholder="Your name" placeholderTextColor={colors.sub} />

            <Text style={styles.modalLabel}>Bio</Text>
            <TextInput style={[styles.input, styles.inputMulti]} value={edBio} onChangeText={setEdBio} placeholder="A line about you" placeholderTextColor={colors.sub} multiline />

            <Text style={styles.modalLabel}>Avatar URL</Text>
            <TextInput style={styles.input} value={edAvatar} onChangeText={setEdAvatar} placeholder="https://…" placeholderTextColor={colors.sub} autoCapitalize="none" />

            <View style={styles.modalActions}>
              <Btn sm onPress={() => setEditOpen(false)}>Cancel</Btn>
              <Btn solid sm onPress={saveProfile}>{updateUser.isPending ? 'Saving…' : 'Save'}</Btn>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const CELL_GAP = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, flexDirection: 'column' },
  body: { flex: 1, overflow: 'hidden' },
  leftCol: { flex: 1, flexDirection: 'column' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalSheet: { width: '100%', maxWidth: 460, backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  modalLabel: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.ink, backgroundColor: colors.panel },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },

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
  postPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.sub },
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
  tripCoverImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
