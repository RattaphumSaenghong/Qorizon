/**
 * User Profile
 */
import React, { useCallback, useMemo, useState } from 'react';
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
  useUserMapStops,
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
import { PressableScale } from '../../src/components/PressableScale';
import { TripSettingsMenu } from '../../src/components/TripSettingsMenu';
import { useAuthStore } from '../../src/stores/authStore';
import { signOut } from '../../src/lib/auth';
import { useResponsive } from '../../src/hooks/useResponsive';


type Tab = 'Posts' | 'Trips' | 'Map';

// Bio header
function ProfileHeader({
  profile,
  isOwn,
  onSignOut,
  isFollowing,
  onToggleFollow,
  onEditProfile,
  postsCount,
  isPhone,
}: {
  profile: UserRow;
  isOwn: boolean;
  onSignOut: () => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onEditProfile: () => void;
  postsCount: number;
  isPhone: boolean;
}) {
  return (
    <View style={[styles.header, isPhone && styles.headerPhone]}>
      <Avatar size={isPhone ? 72 : 88} ring imageUri={profile.avatar_url} />

      <View style={[styles.headerMeta, isPhone && styles.headerMetaPhone]}>
        <View style={[styles.nameRow, isPhone && styles.nameRowPhone]}>
          <View style={isPhone && styles.nameCentered}>
            <Text style={styles.displayName}>{profile.display_name ?? profile.username}</Text>
            <Text style={styles.handle}>@{profile.username}</Text>
          </View>
          <View style={[styles.headerActions, isPhone && styles.headerActionsPhone]}>
            {isOwn ? (
              <>
                <Btn sm onPress={onEditProfile}>Edit profile</Btn>
                <Btn sm onPress={onSignOut}>Sign out</Btn>
              </>
            ) : (
              <>
                <Btn solid={!isFollowing} sm onPress={onToggleFollow} style={isFollowing ? styles.followingBtn : undefined}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Btn>
                <Btn sm>Message</Btn>
              </>
            )}
          </View>
        </View>

        <View style={[styles.stats, isPhone && styles.statsPhone]}>
          <StatPill value={postsCount} label="posts" />
          <View style={styles.statDivider} />
          <StatPill value={profile.follower_count.toLocaleString()} label="followers" />
          <View style={styles.statDivider} />
          <StatPill value={profile.following_count} label="following" />
        </View>

        {profile.bio ? <Text style={[styles.bio, isPhone && styles.bioCentered]}>{profile.bio}</Text> : null}
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

  // Tab bar
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
            {t === 'Posts' ? 'Posts' : t === 'Trips' ? 'Trips' : 'Map'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

  // Posts grid
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
                <Text style={styles.multiTagText}>+</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

  // Trips grid
type TripMode = 'story' | 'plan';

function TripCard({
  trip,
  onOpen,
  isPhone,
  isOwn,
  onOpenMenu,
}: {
  trip: TripWithAuthor;
  onOpen: (trip: TripWithAuthor, mode: TripMode) => void;
  isPhone?: boolean;
  isOwn?: boolean;
  onOpenMenu?: (trip: TripWithAuthor) => void;
}) {
  // Own trips: drafts open the planner; active/finished trips open their view
  // (Story → journal, or the album once finished). Others' always default to Story.
  const [mode, setMode] = useState<TripMode>(
    isOwn && trip.stage === 'planning' ? 'plan' : 'story',
  );

  const statusColor = trip.status === 'active'
    ? colors.acc
    : trip.status === 'draft'
    ? colors.sub
    : colors.line;

  const statusLabel = trip.status === 'active'
    ? 'LIVE'
    : trip.status === 'draft'
    ? 'Draft'
    : trip.status === 'archived'
    ? 'Archived'
    : 'completed';

  return (
    <TouchableOpacity
      style={[styles.tripCard, isPhone && styles.tripCardPhone]}
      onPress={() => onOpen(trip, mode)}
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

        {/* Owner settings (⋯) */}
        {isOwn && (
          <PressableScale
            onPress={() => onOpenMenu?.(trip)}
            style={styles.cardMenuBtn}
            accessibilityLabel="Trip settings"
          >
            <Text style={styles.cardMenuText}>⋯</Text>
          </PressableScale>
        )}

        {/* Plan / Story toggle - sits bottom of cover */}
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
            <Text style={styles.tripForks}>Forks {trip.fork_count}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TripsGrid({
  trips,
  onOpen,
  isPhone,
  isOwn,
  showArchived,
  onToggleArchived,
}: {
  trips: TripWithAuthor[];
  onOpen: (trip: TripWithAuthor, mode: TripMode) => void;
  isPhone?: boolean;
  isOwn?: boolean;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}) {
  const [menuTrip, setMenuTrip] = useState<TripWithAuthor | null>(null);

  const archivedToggle = isOwn ? (
    <View style={styles.tripsToolbar}>
      <PressableScale onPress={onToggleArchived} style={styles.archivedToggle}>
        <Text style={styles.archivedToggleText}>
          {showArchived ? '✓ Showing archived' : 'Show archived'}
        </Text>
      </PressableScale>
    </View>
  ) : null;

  if (trips.length === 0) {
    return (
      <View>
        {archivedToggle}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{showArchived ? 'No archived trips.' : 'No trips yet.'}</Text>
        </View>
      </View>
    );
  }
  return (
    <View>
      {archivedToggle}
      <ScrollView contentContainerStyle={[styles.tripsGrid, isPhone && styles.tripsGridPhone]}>
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} onOpen={onOpen} isPhone={isPhone} isOwn={isOwn} onOpenMenu={setMenuTrip} />
        ))}
      </ScrollView>
      <TripSettingsMenu visible={!!menuTrip} trip={menuTrip} onClose={() => setMenuTrip(null)} />
    </View>
  );
}

  // Travel map
function TravelMap({
  stops,
  isOwn,
  onOpenTrip,
}: {
  stops: StopWithMedia[];
  isOwn: boolean;
  onOpenTrip: (tripId: string) => void;
}) {
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const pins = useMemo(
    () =>
      stops
        .filter((stop) => stop.latitude != null && stop.longitude != null)
        .map((stop) => ({
          id: stop.id,
          latitude: stop.latitude as number,
          longitude: stop.longitude as number,
          location: stop.location_name ?? (stop.status === 'planned' ? 'Planned stop' : 'Visited stop'),
          caption: stop.notes ?? stop.caption ?? '',
          photoUrl: stop.status === 'visited' ? stop.media[0]?.cdn_url ?? stop.media[0]?.url : undefined,
          markerKind: stop.status === 'planned' ? ('planned' as const) : ('visited' as const),
          tripId: stop.trip_id,
          onPress: () => onOpenTrip(stop.trip_id),
        })),
    [stops, onOpenTrip],
  );

  const mapCenter = useMemo(() => {
    if (pins.length === 0) return { latitude: 20, longitude: 80, zoom: 2 };

    const latitudes = pins.map((pin) => pin.latitude);
    const longitudes = pins.map((pin) => pin.longitude);
    const latitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length;
    const longitude = longitudes.reduce((sum, value) => sum + value, 0) / longitudes.length;
    const spread = Math.max(
      Math.max(...latitudes) - Math.min(...latitudes),
      Math.max(...longitudes) - Math.min(...longitudes),
    );
    const zoom = spread > 90 ? 2 : spread > 35 ? 3 : spread > 12 ? 4 : spread > 4 ? 6 : 10;

    return { latitude, longitude, zoom };
  }, [pins]);

  const visitedPlaces = pins.filter((pin) => pin.markerKind === 'visited').length;
  const tripCount = new Set(pins.map((pin) => pin.tripId)).size;
  const hoveredTrail = useMemo(
    () =>
      hoveredTripId
        ? stops
            .filter((stop) => stop.trip_id === hoveredTripId && stop.latitude != null && stop.longitude != null)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((stop) => [stop.longitude as number, stop.latitude as number] as [number, number])
        : [],
    [hoveredTripId, stops],
  );
  const handleHoverPost = useCallback(
    (id: string | null) => {
      const pin = id ? pins.find((item) => item.id === id) : null;
      setHoveredTripId(pin?.tripId ?? null);
    },
    [pins],
  );
  const handleSelectPost = useCallback(
    (id: string) => {
      const pin = pins.find((item) => item.id === id);
      pin?.onPress();
    },
    [pins],
  );

  return (
    <View style={styles.mapContainer}>
      <MapView
        initialLongitude={mapCenter.longitude}
        initialLatitude={mapCenter.latitude}
        initialZoom={mapCenter.zoom}
        center={pins.length ? { latitude: mapCenter.latitude, longitude: mapCenter.longitude } : null}
        posts={pins}
        trail={hoveredTrail.length >= 2 ? hoveredTrail : []}
        onHoverPost={handleHoverPost}
        onSelectPost={handleSelectPost}
        style={styles.travelMap}
      />

      {pins.length === 0 ? (
        <View style={styles.mapEmpty}>
          <Text style={styles.mapEmptyText}>
            {isOwn
              ? 'No places pinned yet - your visited stops will appear here.'
              : "Hasn't shared any places yet."}
          </Text>
        </View>
      ) : (
        <View style={styles.mapStats}>
          <Text style={styles.mapStatsText}>
            {visitedPlaces} place{visitedPlaces === 1 ? '' : 's'} {'\u00b7'} {tripCount} trip
            {tripCount === 1 ? '' : 's'}
          </Text>
        </View>
      )}
    </View>
  );
}

// Main screen
export default function ProfileScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
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

  const [showArchived, setShowArchived] = useState(false);
  const tripsQ = useUserTrips(profile?.id ?? '', isOwn && showArchived);
  const postsQ = useUserPosts(profile?.id ?? '');
  const mapStopsQ = useUserMapStops(profile?.id ?? '');
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
    if (tab === 'Saved') router.push('/(tabs)/saved');
    if (tab === 'Book') router.push('/(tabs)/book');
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
            isPhone={isPhone}
          />
          <TabBar active={activeTab} onChange={setActiveTab} />

          <View style={styles.tabContent}>
            {activeTab === 'Posts' && (
              <PostsGrid posts={postsQ.data ?? []} onPress={(tripId) => router.push(`/journal/${tripId}`)} />
            )}
            {activeTab === 'Trips' && (
              <TripsGrid
                trips={tripsQ.data ?? []}
                isPhone={isPhone}
                isOwn={isOwn}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived((v) => !v)}
                onOpen={(t, mode) => {
                  if (mode === 'plan') router.push(`/builder/${t.id}`);
                  else if (t.stage === 'album') router.push(`/album/${t.id}`);
                  else router.push(`/journal/${t.id}`);
                }}
              />
            )}
            {activeTab === 'Map' && (
              <TravelMap
                stops={mapStopsQ.data ?? []}
                isOwn={isOwn}
                onOpenTrip={(tripId) => router.push(`/journal/${tripId}`)}
              />
            )}
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
            <TextInput style={styles.input} value={edAvatar} onChangeText={setEdAvatar} placeholder="https://..." placeholderTextColor={colors.sub} autoCapitalize="none" />

            <View style={styles.modalActions}>
              <Btn sm onPress={() => setEditOpen(false)}>Cancel</Btn>
              <Btn solid sm onPress={saveProfile}>{updateUser.isPending ? 'Saving...' : 'Save'}</Btn>
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

  // Header
  header: {
    flexDirection: 'row',
    gap: spacing.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  headerPhone: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerMeta: { flex: 1, gap: spacing.md },
  headerMetaPhone: { flex: undefined, width: '100%', alignItems: 'center', gap: spacing.sm },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameRowPhone: { flexDirection: 'column', alignItems: 'center', gap: spacing.sm },
  nameCentered: { alignItems: 'center' },
  displayName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.ink },
  handle: { fontSize: fontSize.md, color: colors.sub, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerActionsPhone: { justifyContent: 'center' },
  followingBtn: { opacity: 0.7 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statsPhone: { justifyContent: 'center' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: fontSize.xs, color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.line },

  bio: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },
  bioCentered: { textAlign: 'center' },

// Tab bar
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

// Posts grid
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

// Trips grid
  tripsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  tripsGridPhone: { padding: spacing.md, gap: spacing.sm },
  tripsToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  archivedToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  archivedToggleText: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '600' },
  tripCard: {
    width: '30%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  tripCardPhone: { width: '46%' },
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
  cardMenuBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(44,42,38,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMenuText: { fontSize: 18, color: colors.white, fontWeight: '700', lineHeight: 20 },

  // Plan / Story toggle
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

// Travel map
  mapContainer: { flex: 1, position: 'relative' },
  travelMap: { flex: 1 },
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
  mapEmpty: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapEmptyText: { fontSize: fontSize.md, color: colors.sub, textAlign: 'center' },
});
