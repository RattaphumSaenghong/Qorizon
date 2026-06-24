/**
 * Trip Album — two views:
 *   Grid    : GPS trail map + location-clustered photo grid (AlbumA)
 *   Scrapbook: two-page diary spread, paginated by day (JournalC)
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAlbum, useTrail, useUpdateAlbum, useContributors, usePool, useUploadTripMedia, useUpdateMedia, useDeleteMedia } from '@trailr/db';
import type { AlbumItem, PoolItem } from '@trailr/db';
import { MemberSwitcher } from '../../src/components/MemberSwitcher';
import { colors, spacing, fontSize, radius, shadow } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView } from '../../src/components/MapView';
import { MapSheet } from '../../src/components/MapSheet';
import { ScrapbookSpread } from '../../src/components/ScrapbookSpread';
import { CoverImage } from '../../src/components/CoverImage';
import { PressableScale } from '../../src/components/PressableScale';
import { useAuthStore } from '../../src/stores/authStore';
import { useCollapsibleSplit } from '../../src/hooks/useCollapsibleSplit';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useToast } from '../../src/components/Toast';
import type { Day, Moment } from '../../src/data/mockTrips';

type ViewMode = 'grid' | 'scrapbook' | 'pool';

interface Cluster {
  title: string;
  caption: string;
  items: AlbumItem[];
}

/** Group album items into clusters by location (preserving first-seen order). */
function clusterByLocation(items: AlbumItem[]): Cluster[] {
  const order: string[] = [];
  const map = new Map<string, Cluster>();
  for (const it of items) {
    const key = it.location_name ?? 'Unknown';
    let c = map.get(key);
    if (!c) {
      c = { title: key, caption: it.caption ?? '', items: [] };
      map.set(key, c);
      order.push(key);
    }
    c.items.push(it);
  }
  return order.map((k) => map.get(k)!);
}

/** Derive scrapbook "days" from album items, grouped by capture date. */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function deriveDays(items: AlbumItem[]): Day[] {
  const order: string[] = [];
  const byDate = new Map<string, AlbumItem[]>();
  for (const it of items) {
    const key = it.captured_at ? it.captured_at.slice(0, 10) : 'undated';
    if (!byDate.has(key)) { byDate.set(key, []); order.push(key); }
    byDate.get(key)!.push(it);
  }
  return order.map((key, di) => {
    const dayItems = byDate.get(key)!;
    const dt = key !== 'undated' ? new Date(key) : null;
    const moments: Moment[] = dayItems.map((it, i) => ({
      time: '',
      location: it.location_name ?? '',
      caption: it.caption ?? '',
      latitude: it.latitude ?? 0,
      longitude: it.longitude ?? 0,
      hasVideo: it.type === 'video',
      hasAudio: it.type === 'audio',
      photoHeight: [200, 170, 150][i % 3],
    }));
    return {
      n: di + 1,
      place: dayItems[0]?.location_name ?? '',
      date: dt ? `${MONTHS[dt.getMonth()]} ${dt.getDate()}` : '',
      moments,
    };
  });
}

// ── Grid clusters ────────────────────────────────────────────
interface ClusterGridProps {
  clusters: Cluster[];
  editing: boolean;
  onToggleExclude: (item: AlbumItem) => void;
  onEditCaption: (item: AlbumItem) => void;
}
function ClusterGrid({ clusters, editing, onToggleExclude, onEditCaption }: ClusterGridProps) {
  if (clusters.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos in this album yet.</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.gridContent}>
      {clusters.map((cluster, ci) => (
        <View key={ci} style={styles.cluster}>
          <View style={styles.clusterHeader}>
            <Text style={styles.clusterTitle}>{cluster.title}</Text>
            <Chip dot={false} style={styles.clusterTime}>{cluster.items.length} photos</Chip>
          </View>
          <View style={styles.photoGrid}>
            {cluster.items.map((item) => (
              <View key={item.media_id} style={styles.photoCell}>
                <TouchableOpacity
                  style={styles.photoCellInner}
                  activeOpacity={0.8}
                  disabled={!editing}
                  onPress={() => (item.excluded ? onToggleExclude(item) : onEditCaption(item))}
                >
                  <CoverImage
                    uri={item.cdn_url ?? item.url}
                    style={[styles.photoCellImg, item.excluded && styles.photoExcluded]}
                    labelStyle={styles.photoCellLabel}
                  />
                  {item.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoOverlayText}>▶</Text>
                    </View>
                  )}
                  {editing && item.excluded && (
                    <View style={styles.hiddenBadge}>
                      <Text style={styles.hiddenBadgeText}>hidden</Text>
                    </View>
                  )}
                  {editing && !item.excluded && (item.caption ?? '') !== '' && (
                    <View style={styles.captionDot} />
                  )}
                </TouchableOpacity>
                {editing && (
                  <TouchableOpacity
                    style={[styles.excludeBtn, item.excluded && styles.excludeBtnAdd]}
                    onPress={() => onToggleExclude(item)}
                  >
                    <Text style={styles.excludeBtnText}>{item.excluded ? '＋' : '✕'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          {cluster.caption ? <Text style={styles.clusterCaption}>{cluster.caption}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

// ── Pool grid ────────────────────────────────────────────────
interface PoolGridProps {
  items: PoolItem[];
  myUserId?: string;
  includedIds: Set<string>;
  onToggleInclude: (item: PoolItem) => void;
  onToggleVisibility: (item: PoolItem) => void;
  onDelete: (item: PoolItem) => void;
  onAdd: () => void;
  isUploading: boolean;
}
function PoolGrid({ items, myUserId, includedIds, onToggleInclude, onToggleVisibility, onDelete, onAdd, isUploading }: PoolGridProps) {
  if (items.length === 0 && !myUserId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No shared photos yet.</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.gridContent}>
      {myUserId && (
        <TouchableOpacity style={styles.addPhotoBtn} onPress={onAdd} disabled={isUploading}>
          {isUploading
            ? <ActivityIndicator color={colors.acc} />
            : <Text style={styles.addPhotoText}>+ Add photos to pool</Text>
          }
        </TouchableOpacity>
      )}
      <View style={styles.photoGrid}>
        {items.map((item) => {
          const isMine = item.user_id === myUserId;
          const isIncluded = includedIds.has(item.id);
          return (
            <View key={item.id} style={styles.photoCell}>
              <View style={styles.photoCellInner}>
                {item.cdn_url || item.url ? (
                  <Image
                    source={{ uri: item.cdn_url ?? item.url }}
                    style={styles.photoCellImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.photoCellLabel}>{item.type}</Text>
                )}
                {item.visibility === 'private' && (
                  <View style={styles.hiddenBadge}>
                    <Text style={styles.hiddenBadgeText}>private</Text>
                  </View>
                )}
                {item.location_name && (
                  <View style={styles.poolLocBadge}>
                    <Text style={styles.poolLocText} numberOfLines={1}>{item.location_name}</Text>
                  </View>
                )}
              </View>
              <View style={styles.poolActions}>
                {!isMine && item.visibility === 'shared' && (
                  <TouchableOpacity
                    style={[styles.poolActionBtn, isIncluded && styles.poolActionBtnActive]}
                    onPress={() => onToggleInclude(item)}
                  >
                    <Text style={[styles.poolActionText, isIncluded && styles.poolActionTextActive]}>
                      {isIncluded ? '✓ In album' : '＋ Add'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isMine && (
                  <>
                    <TouchableOpacity
                      style={styles.poolActionBtn}
                      onPress={() => onToggleVisibility(item)}
                    >
                      <Text style={styles.poolActionText}>
                        {item.visibility === 'shared' ? '🔒 Hide' : '🌐 Share'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.poolActionBtn, styles.poolActionBtnDanger]}
                      onPress={() => onDelete(item)}
                    >
                      <Text style={styles.poolActionText}>✕</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function AlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';

  const user = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  // Whose album is shown. null = owner's (the canonical/public view); default to
  // your own once we know you have memory on this trip.
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { data: contributors = [] } = useContributors(tripId);
  useEffect(() => {
    if (selectedMember === null && user && contributors.some((c) => c.id === user.id)) {
      setSelectedMember(user.id);
    }
  }, [contributors, user, selectedMember]);

  const { data: album, isLoading, error } = useAlbum(tripId, { member: selectedMember, includeExcluded: editing });
  const { data: trail = [] } = useTrail(tripId, selectedMember);
  const update = useUpdateAlbum(tripId);
  const { data: poolItems = [], isLoading: poolLoading } = usePool(tripId);
  const uploadToPool = useUploadTripMedia(tripId);
  const updateMedia = useUpdateMedia(tripId);
  const deleteMedia = useDeleteMedia(tripId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentDay, setCurrentDay] = useState(0);
  // Collapse the photo grid → map-focused (animated 70/30 ↔ 30/70).
  const { focused: mapFocus, toggle: toggleMapFocus, contentWidth } = useCollapsibleSplit();
  const { isPhone } = useResponsive();
  const toast = useToast();
  const [captionItem, setCaptionItem] = useState<AlbumItem | null>(null);
  const [captionText, setCaptionText] = useState('');

  const items = album?.items ?? [];
  // You can edit only your OWN album (the one whose author is you).
  const canEdit = !!user && !!album && user.id === album.author.id;

  // Pool items from other members that appear in my album items = included
  const includedIds = useMemo(() => {
    const albumMediaIds = new Set(items.map((i) => i.media_id));
    return new Set(
      poolItems.filter((p) => p.user_id !== user?.id && albumMediaIds.has(p.id)).map((p) => p.id),
    );
  }, [items, poolItems, user?.id]);

  const pickAndUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('Camera roll permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const base64 = asset.base64 ?? '';
    uploadToPool.mutate({
      type: 'photo',
      content_base64: `data:image/jpeg;base64,${base64}`,
      content_type: 'image/jpeg',
      visibility: 'shared',
    });
  };

  const toggleInclude = (item: PoolItem) => {
    const next = includedIds.has(item.id)
      ? Array.from(includedIds).filter((id) => id !== item.id)
      : [...Array.from(includedIds), item.id];
    update.mutate({ included: next });
  };

  const toggleVisibility = (item: PoolItem) => {
    updateMedia.mutate({
      mediaId: item.id,
      input: { visibility: item.visibility === 'shared' ? 'private' : 'shared' },
    });
  };

  const removeFromPool = (item: PoolItem) => {
    deleteMedia.mutate(item.id);
  };
  const effectiveMember = album?.author.id ?? selectedMember;
  const clusters = useMemo(() => clusterByLocation(items), [items]);
  // Scrapbook reads the published album only (never the hidden ones).
  const days = useMemo(() => deriveDays(items.filter((i) => !i.excluded)), [items]);

  const toggleExclude = (item: AlbumItem) => {
    const excluded = items.filter((i) => i.excluded).map((i) => i.media_id);
    const next = item.excluded
      ? excluded.filter((mid) => mid !== item.media_id)
      : [...excluded, item.media_id];
    update.mutate({ excluded: next });
  };

  const openCaption = (item: AlbumItem) => {
    setCaptionItem(item);
    setCaptionText(item.caption ?? '');
  };
  const saveCaption = () => {
    if (!captionItem) return;
    update.mutate({ captions: { [captionItem.media_id]: captionText.trim() } });
    setCaptionItem(null);
  };

  const onShareAlbum = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trailr.app';
    const url = `${origin}/album/${tripId}`;
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
    if (nav?.share) {
      nav.share({ title: 'Trailr album', url }).catch(() => undefined);
    } else if (nav?.clipboard) {
      await nav.clipboard.writeText(url);
      toast('Album link copied to clipboard');
    } else {
      toast('Share: ' + url);
    }
  };

  const pins = items
    .filter((i) => !i.excluded && i.latitude != null && i.longitude != null)
    .map((i) => ({
      id: i.media_id,
      latitude: i.latitude as number,
      longitude: i.longitude as number,
      location: i.location_name ?? '',
      caption: i.caption ?? '',
    }));
  const trailCoords = trail
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => [p.longitude, p.latitude] as [number, number]);
  // Dashed connector through the photo locations, in album order.
  const photoRoute = pins.map((p) => [p.longitude, p.latitude] as [number, number]);
  const center = pins[0]
    ? { latitude: pins[0].latitude, longitude: pins[0].longitude }
    : trailCoords[0]
      ? { latitude: trailCoords[0][1], longitude: trailCoords[0][0] }
      : { latitude: 13.7563, longitude: 100.5018 };

  // The scrapbook spread is a wide two-page layout — phone falls back to grid (but pool is always available).
  const effectiveView: ViewMode = isPhone && viewMode === 'scrapbook' ? 'grid' : viewMode;

  const mapBlock = (
    <MapView
      initialLatitude={center.latitude}
      initialLongitude={center.longitude}
      initialZoom={11}
      posts={pins}
      trail={trailCoords}
      route={photoRoute}
    >
      <View style={styles.mapNote}>
        <Text style={styles.mapNoteText}>📍 matched to your route</Text>
      </View>
    </MapView>
  );

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, isPhone && styles.headerPhone]}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ back</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <Text style={styles.pageTitle}>Album</Text>
        {album && (
          <Chip dot accent style={styles.photoCount}>
            {album.count} photos
          </Chip>
        )}
        <MemberSwitcher
          members={contributors}
          selectedId={effectiveMember}
          currentUserId={user?.id}
          onSelect={(id) => { setSelectedMember(id); if (id !== user?.id) setEditing(false); }}
        />
        <View style={{ flex: 1 }} />

        {/* view toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.toggleLabel, viewMode === 'grid' && styles.toggleLabelActive]}>
              ▦ Grid
            </Text>
          </TouchableOpacity>
          {!isPhone && (
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'scrapbook' && styles.toggleBtnActive]}
              onPress={() => setViewMode('scrapbook')}
            >
              <Text style={[styles.toggleLabel, viewMode === 'scrapbook' && styles.toggleLabelActive]}>
                ✦ Scrapbook
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'pool' && styles.toggleBtnActive]}
            onPress={() => setViewMode('pool')}
          >
            <Text style={[styles.toggleLabel, viewMode === 'pool' && styles.toggleLabelActive]}>
              ⊕ Pool
            </Text>
          </TouchableOpacity>
        </View>

        {canEdit && (
          <Btn sm onPress={() => setEditing((e) => !e)}>{editing ? 'Done' : 'Edit'}</Btn>
        )}
        <Btn solid sm onPress={onShareAlbum}>Share album</Btn>
      </View>

      {/* ── Body ── */}
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.acc} size="large" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Couldn't load album.</Text>
        </View>
      ) : effectiveView === 'pool' ? (
        poolLoading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.acc} size="large" /></View>
        ) : (
          <PoolGrid
            items={poolItems}
            myUserId={user?.id}
            includedIds={includedIds}
            onToggleInclude={toggleInclude}
            onToggleVisibility={toggleVisibility}
            onDelete={removeFromPool}
            onAdd={pickAndUpload}
            isUploading={uploadToPool.isPending}
          />
        )
      ) : effectiveView === 'grid' && isPhone ? (
        /* ── Phone: full-width grid + map in a bottom sheet ── */
        <View style={styles.phoneBody}>
          <View style={styles.phoneGrid}>
            <ClusterGrid
              clusters={clusters}
              editing={editing}
              onToggleExclude={toggleExclude}
              onEditCaption={openCaption}
            />
          </View>
          <MapSheet title={`🗺  Photo map · ${pins.length}`}>{mapBlock}</MapSheet>
        </View>
      ) : effectiveView === 'grid' ? (
        <View style={styles.gridBody}>
          {/* GPS trail map (fills remaining width) */}
          <Animated.View style={[styles.mapCol, styles.mapColFill]}>
            {mapBlock}
            {/* collapse handle — toggles grid/map split between 70/30 and 30/70 */}
            <PressableScale style={styles.collapseHandle} onPress={toggleMapFocus}>
              <Text style={styles.collapseHandleIcon}>{mapFocus ? '‹' : '›'}</Text>
            </PressableScale>
          </Animated.View>

          {/* clustered grid (collapses to 30% in map-focus) */}
          <Animated.View style={{ width: contentWidth }}>
            <ClusterGrid
              clusters={clusters}
              editing={editing}
              onToggleExclude={toggleExclude}
              onEditCaption={openCaption}
            />
          </Animated.View>
        </View>
      ) : (
        /* ── Scrapbook view ── */
        <View style={styles.scrapbookBody}>
          {/* day selector strip */}
          <View style={styles.dayStrip}>
            <Text style={styles.dayStripLabel}>Days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripScroll}>
              {days.map((day, i) => (
                <TouchableOpacity
                  key={day.n}
                  onPress={() => setCurrentDay(i)}
                  style={[styles.dayStripItem, i === currentDay && styles.dayStripItemActive]}
                >
                  <Text style={[styles.dayStripNum, i === currentDay && styles.dayStripNumActive]}>
                    D{day.n}
                  </Text>
                  <Text style={styles.dayStripPlace} numberOfLines={1}>{day.place}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* spread */}
          {days[currentDay] && (
            <ScrapbookSpread
              day={days[currentDay]}
              dayIndex={currentDay}
              totalDays={days.length}
              onPrev={() => setCurrentDay((d) => Math.max(0, d - 1))}
              onNext={() => setCurrentDay((d) => Math.min(days.length - 1, d + 1))}
            />
          )}
        </View>
      )}

      {/* ── Caption editor ── */}
      <Modal
        visible={!!captionItem}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptionItem(null)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCaptionItem(null)}>
          <TouchableOpacity style={styles.captionSheet} activeOpacity={1}>
            <Text style={styles.captionTitle}>Photo caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption…"
              placeholderTextColor={colors.sub}
              value={captionText}
              onChangeText={setCaptionText}
              multiline
              autoFocus
            />
            <Text style={styles.captionHint}>Leave blank to use the stop's caption.</Text>
            <View style={styles.captionActions}>
              <Btn sm onPress={() => setCaptionItem(null)}>Cancel</Btn>
              <Btn solid sm onPress={saveCaption}>{update.isPending ? '…' : 'Save'}</Btn>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, flexDirection: 'column' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  // Phone: let the busy header wrap to two rows instead of clipping.
  headerPhone: {
    height: undefined,
    minHeight: 56,
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  phoneBody: { flex: 1 },
  phoneGrid: { flex: 1 },
  backBtn: { paddingVertical: 4 },
  backText: { color: colors.sub, fontSize: fontSize.sm },
  separator: { width: 1, height: 20, backgroundColor: colors.line, marginHorizontal: 4 },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink },
  photoCount: { marginLeft: 4 },

  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: colors.acc,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  toggleLabelActive: {
    color: colors.white,
  },

  // grid view
  gridBody: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mapCol: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  mapColFill: { flex: 1 },
  collapseHandle: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -24,
    zIndex: 10,
    width: 22,
    height: 48,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  collapseHandleIcon: { fontSize: 20, color: colors.ink, fontWeight: '700' },
  mapNote: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mapNoteText: { fontSize: fontSize.xs },
  gridContent: { padding: spacing.xl, gap: spacing.xl },
  cluster: { gap: spacing.md },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clusterTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  clusterTime: {},
  clusterCaption: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '22%', aspectRatio: 1 },
  photoCellInner: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCellLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  photoCellImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  videoOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(44,42,38,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  videoOverlayText: { fontSize: fontSize.xs, color: colors.white },

  // edit mode
  photoExcluded: { opacity: 0.3 },
  hiddenBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(44,42,38,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hiddenBadgeText: { fontSize: fontSize.xs, color: colors.white },
  captionDot: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.acc,
  },
  excludeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludeBtnAdd: { backgroundColor: colors.acc },
  excludeBtnText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },

  // caption editor modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,42,38,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  captionSheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
  },
  captionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink },
  captionInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
    textAlignVertical: 'top',
  },
  captionHint: { fontSize: fontSize.xs, color: colors.sub },
  captionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },

  addCaptionCell: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addCaptionText: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center' },
  addPhotoBtn: {
    borderWidth: 1.5,
    borderColor: colors.acc,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addPhotoText: { color: colors.acc, fontWeight: '600', fontSize: fontSize.sm },
  poolLocBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(44,42,38,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  poolLocText: { fontSize: fontSize.xs, color: colors.white },
  poolActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  poolActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: 3,
    alignItems: 'center',
  },
  poolActionBtnActive: {
    borderColor: colors.acc,
    backgroundColor: colors.accSoft,
  },
  poolActionBtnDanger: {
    flex: 0,
    paddingHorizontal: 8,
    borderColor: colors.line,
  },
  poolActionText: { fontSize: fontSize.xs, color: colors.sub },
  poolActionTextActive: { color: colors.acc, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.sub, fontSize: fontSize.md },

  // scrapbook view
  scrapbookBody: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
    backgroundColor: colors.paper,
  },
  dayStripLabel: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '600' },
  dayStripScroll: { gap: spacing.sm },
  dayStripItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  dayStripItemActive: {
    backgroundColor: colors.accSoft,
    borderColor: colors.acc,
  },
  dayStripNum: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.sub,
  },
  dayStripNumActive: { color: colors.acc },
  dayStripPlace: {
    fontSize: fontSize.xs,
    color: colors.sub,
    maxWidth: 70,
  },
});
