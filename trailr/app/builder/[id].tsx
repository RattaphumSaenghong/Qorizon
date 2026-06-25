/**
 * Trip Builder — day timeline + route map.
 * Build a plan: tap the map to drop stops, edit/reorder them, then publish.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, radius, shadow } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { CoverImage } from '../../src/components/CoverImage';
import { MapView } from '../../src/components/MapView';
import { MapSheet } from '../../src/components/MapSheet';
import { PressableScale } from '../../src/components/PressableScale';
import { useInventory, useTrip, useTripStops, useUpdateTrip, useAddTripDay, useUpdateTripDay, useDeleteTripDay, fetchTripDays, createStop, updateStop, deleteStop, useTripMembers } from '@trailr/db';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { StopWithMedia, TripDayRow } from '@trailr/db';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/components/Toast';
import { useResponsive } from '../../src/hooks/useResponsive';
import { TripMembersModal } from '../../src/components/TripMembersModal';
import { TripChatModal } from '../../src/components/TripChatModal';
import { TripSettingsMenu } from '../../src/components/TripSettingsMenu';
import { DatePicker } from '../../src/components/DatePicker';
import { WhoForControl } from '../../src/components/WhoForControl';
import type { AssigneeMember } from '../../src/components/WhoForControl';
import { PaidByControl } from '../../src/components/PaidByControl';
import { MemberSwitcher } from '../../src/components/MemberSwitcher';
import { BookingSearchModal } from '../../src/components/BookingSearchModal';
import { HotelRecsSheet } from '../../src/components/HotelRecsSheet';
import { computeSettlement } from '../../src/lib/budget';
import { suggestPlaces, retrievePlace, newSessionToken, type PlaceSuggestion } from '../../src/lib/places';

type Suggestion = PlaceSuggestion;

const CATEGORIES = ['place', 'food', 'landmark', 'activity', 'hotel', 'flight', 'transport', 'note'] as const;
type Category = (typeof CATEGORIES)[number];
type LogisticsType = 'flight' | 'hotel';

interface BuilderDay {
  id: string;
  n: number;
  place: string;
  date: string | null;
  stops: StopWithMedia[];
}

interface Coord {
  latitude: number;
  longitude: number;
}

function isLogistics(stop: StopWithMedia): boolean {
  return stop.category === 'flight' || stop.category === 'hotel';
}

function StopCard({
  stop,
  currency,
  index,
  selected,
  onSelect,
  onEdit,
  onRemove,
  onUp,
  onDown,
  canUp,
  canDown,
}: {
  stop: StopWithMedia;
  currency: string;
  index?: number;
  selected?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const photoUri = stop.media?.[0] ? stop.media[0].cdn_url ?? stop.media[0].url : undefined;
  return (
    <View style={[styles.stopCard, selected && styles.stopCardSelected]}>
      <PressableScale
        style={styles.stopMain}
        onPress={onSelect}
        accessibilityRole="button"
        accessibilityLabel={`Show ${stop.location_name ?? 'stop'} on map`}
      >
        <View style={styles.stopPhoto}>
          <CoverImage uri={photoUri} style={styles.stopPhotoImg} labelStyle={styles.stopPhotoLabel} />
          {index != null && stop.latitude != null && (
            <View style={styles.stopIndex}><Text style={styles.stopIndexText}>{index}</Text></View>
          )}
        </View>
        <View style={styles.stopMeta}>
          <Text style={styles.stopLocation}>{stop.location_name ?? 'Untitled stop'}</Text>
          <View style={styles.stopMetaRow}>
            {stop.category ? <Chip dot={false} style={styles.stopCat}>{stop.category}</Chip> : null}
            {stop.planned_start ? <Chip dot accent style={styles.stopTime}>{stop.planned_start}{stop.planned_end ? ` – ${stop.planned_end}` : ''}</Chip> : null}
            {stop.cost != null ? <Chip dot={false} style={styles.stopCost}>{`${stop.cost.toLocaleString()} ${currency}`}</Chip> : null}
          </View>
          {stop.notes ? <Text style={styles.stopCaption} numberOfLines={2}>{stop.notes}</Text> : null}
          {stop.scope === 'assigned' && stop.assignees.length > 0 && (
            <View style={styles.assigneeRow}>
              {stop.assignees.slice(0, 4).map((a) =>
                a.avatar_url ? (
                  <Image key={a.id} source={{ uri: a.avatar_url }} style={styles.assigneeAvatar} />
                ) : (
                  <View key={a.id} style={[styles.assigneeAvatar, styles.assigneeAvatarFallback]}>
                    <Text style={styles.assigneeInitial}>{((a.display_name ?? a.username)?.[0] ?? '?').toUpperCase()}</Text>
                  </View>
                )
              )}
              {stop.assignees.length > 4 && (
                <View style={[styles.assigneeAvatar, styles.assigneeAvatarFallback]}>
                  <Text style={styles.assigneeInitial}>+{stop.assignees.length - 4}</Text>
                </View>
              )}
            </View>
          )}
          {stop.latitude == null && (
            <Text style={styles.noLoc}>⚠ no location — tap the map to pin one</Text>
          )}
        </View>
      </PressableScale>
      <View style={styles.stopActions}>
        <PressableScale onPress={onEdit} accessibilityLabel="Edit stop">
          <Text style={styles.editIcon}>✎</Text>
        </PressableScale>
        <PressableScale onPress={onUp} disabled={!canUp} accessibilityLabel="Move up">
          <Text style={[styles.reorderIcon, !canUp && styles.reorderDisabled]}>▲</Text>
        </PressableScale>
        <PressableScale onPress={onDown} disabled={!canDown} accessibilityLabel="Move down">
          <Text style={[styles.reorderIcon, !canDown && styles.reorderDisabled]}>▼</Text>
        </PressableScale>
        <PressableScale onPress={onRemove} accessibilityLabel="Remove stop">
          <Text style={styles.removeBtnText}>✕</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function DroppableDaySection({
  id, onLayout, children,
}: {
  id: string;
  onLayout?: (y: number) => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <View
      ref={setNodeRef as any}
      style={[styles.droppable, isOver && styles.droppableOver]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      {children}
    </View>
  );
}

function DraggableStopRow({
  stop, currency, index, selected, onSelect, onEdit, onRemove, onUp, onDown, canUp, canDown,
}: {
  stop: StopWithMedia; currency: string; index?: number; selected?: boolean;
  onSelect: () => void; onEdit: () => void; onRemove: () => void;
  onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: stop.id });
  return (
    <View ref={setNodeRef as any} style={[styles.stopRow, isDragging && styles.stopRowDragging]}>
      <View style={styles.dragHandle} {...(listeners as any)} {...(attributes as any)}>
        <Text style={styles.dragHandleIcon}>⠿</Text>
      </View>
      <View style={styles.railCol}>
        <View style={[styles.railDot, selected && styles.railDotActive]} />
      </View>
      <View style={{ flex: 1 }}>
        <StopCard stop={stop} currency={currency} index={index} selected={selected} onSelect={onSelect} onEdit={onEdit} onRemove={onRemove} onUp={onUp} onDown={onDown} canUp={canUp} canDown={canDown} />
      </View>
    </View>
  );
}

function LogisticsBlock({
  title,
  type,
  stops,
  currency,
  selectedStopId,
  onAdd,
  onInbox,
  onSelect,
  onEdit,
  onRemove,
  inboxCount,
  onSuggest,
  onExplore,
}: {
  title: string;
  type: LogisticsType;
  stops: StopWithMedia[];
  currency: string;
  selectedStopId: string | null;
  onAdd: (type: LogisticsType) => void;
  onInbox: (type: LogisticsType) => void;
  onSelect: (id: string) => void;
  onEdit: (stop: StopWithMedia) => void;
  onRemove: (id: string) => void;
  inboxCount: number;
  onSuggest?: () => void;
  onExplore?: () => void;
}) {
  const icon = type === 'flight' ? '✈' : '🛏';
  const subtotal = stops.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  return (
    <View style={styles.logisticsBlock}>
      <View style={styles.logisticsHeader}>
        <View style={styles.logisticsTitleWrap}>
          <Text style={styles.logisticsTitle}>{icon}  {title}</Text>
          <View style={styles.logisticsCount}><Text style={styles.logisticsCountText}>{stops.length}</Text></View>
          {subtotal > 0 ? (
            <Text style={styles.logisticsSubtotal}>{subtotal.toLocaleString()} {currency}</Text>
          ) : null}
          {inboxCount > 0 ? (
            <View style={styles.inboxBadge}><Text style={styles.inboxBadgeText}>{inboxCount} inbox</Text></View>
          ) : null}
        </View>
        <View style={styles.logisticsHeaderActions}>
          {onSuggest ? <Btn sm solid onPress={onSuggest}>Suggest</Btn> : null}
          {onExplore ? <Btn sm onPress={onExplore}>Explore</Btn> : null}
          <Btn sm onPress={() => onAdd(type)}>Search</Btn>
          <Btn sm onPress={() => onInbox(type)}>Inbox</Btn>
        </View>
      </View>

      {stops.length === 0 ? (
        <View style={styles.logisticsEmpty}>
          <Text style={styles.logisticsEmptyText}>
            {type === 'flight' ? 'Search fares or add a flight manually.' : 'Search stays or add one manually.'}
          </Text>
        </View>
      ) : (
        stops.map((stop) => {
          const selected = stop.id === selectedStopId;
          const hasLocation = stop.latitude != null && stop.longitude != null;
          const detail = type === 'flight'
            ? [stop.planned_start, stop.planned_end].filter(Boolean).join(' - ') || stop.notes || 'Flight details'
            : stop.notes || (hasLocation ? 'Pinned on map' : 'Stay details');
          return (
            <View key={stop.id} style={[styles.logisticsCard, selected && styles.logisticsCardSelected]}>
              <PressableScale
                style={styles.logisticsMain}
                onPress={() => onSelect(stop.id)}
                accessibilityRole="button"
                accessibilityLabel={`Show ${stop.location_name ?? title}`}
              >
                <View style={styles.logisticsIcon}>
                  <Text style={styles.logisticsIconText}>{icon}</Text>
                </View>
                <View style={styles.logisticsMeta}>
                  <Text style={styles.logisticsName} numberOfLines={1}>{stop.location_name ?? (type === 'flight' ? 'Flight' : 'Stay')}</Text>
                  <Text style={styles.logisticsDetail} numberOfLines={2}>{detail}</Text>
                  {stop.cost != null ? (
                    <Text style={styles.logisticsCost}>{stop.cost.toLocaleString()} {currency}</Text>
                  ) : null}
                  {stop.scope === 'assigned' && stop.assignees.length > 0 && (
                    <View style={styles.assigneeRow}>
                      {stop.assignees.slice(0, 4).map((a) =>
                        a.avatar_url ? (
                          <Image key={a.id} source={{ uri: a.avatar_url }} style={styles.assigneeAvatar} />
                        ) : (
                          <View key={a.id} style={[styles.assigneeAvatar, styles.assigneeAvatarFallback]}>
                            <Text style={styles.assigneeInitial}>{((a.display_name ?? a.username)?.[0] ?? '?').toUpperCase()}</Text>
                          </View>
                        )
                      )}
                      {stop.assignees.length > 4 && (
                        <View style={[styles.assigneeAvatar, styles.assigneeAvatarFallback]}>
                          <Text style={styles.assigneeInitial}>+{stop.assignees.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </PressableScale>
              <View style={styles.logisticsActions}>
                <PressableScale onPress={() => onEdit(stop)} accessibilityLabel="Edit logistics stop">
                  <Text style={styles.editIcon}>✎</Text>
                </PressableScale>
                <PressableScale onPress={() => onRemove(stop.id)} accessibilityLabel="Remove logistics stop">
                  <Text style={styles.removeBtnText}>✕</Text>
                </PressableScale>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

export default function BuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isPhone } = useResponsive();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: stops = [], isLoading: stopsLoading } = useTripStops(tripId);
  const { data: dayRows = [], isLoading: daysLoading } = useQuery({
    queryKey: ['trip', tripId, 'days'],
    queryFn: () => fetchTripDays(tripId),
    enabled: !!tripId,
  });
  const updateTrip = useUpdateTrip(tripId);
  const addDay = useAddTripDay(tripId);
  const updateDay = useUpdateTripDay(tripId);
  const deleteDay = useDeleteTripDay(tripId);
  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const { data: memberItems = [] } = useTripMembers(tripId);
  const { data: flightInventory = [] } = useInventory('flight');
  const { data: stayInventory = [] } = useInventory('hotel');
  const assigneeMembers: AssigneeMember[] = memberItems
    .filter((m) => m.status === 'accepted')
    .map((m) => ({
      id: m.user.id,
      username: m.user.username,
      display_name: m.user.display_name,
      avatar_url: m.user.avatar_url,
    }));

  const [formDayId, setFormDayId] = useState<string | undefined>(undefined);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // Scroll the timeline to the section holding the selected stop (pin → card).
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  // Day-edit modal (label + date).
  const [dayEditId, setDayEditId] = useState<string | null>(null);
  const [dayPlace, setDayPlace] = useState('');
  const [dayDate, setDayDate] = useState('');
  const [daySaving, setDaySaving] = useState(false);

  // Budget-edit modal.
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Add / edit stop form.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StopWithMedia | null>(null);
  const [formCoord, setFormCoord] = useState<Coord | null>(null);
  const [formLoc, setFormLoc] = useState('');
  const [formCat, setFormCat] = useState<Category>('place');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPlaceId, setFormPlaceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoFromSelection = useRef(false);
  const searchSession = useRef<string>(newSessionToken());
  // Latest stops, readable from the debounced search without making it a dep
  // (stops is a fresh array each render → would otherwise loop the effect).
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const [submitting, setSubmitting] = useState(false);
  const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
  const [formPaidBy, setFormPaidBy] = useState<string | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<LogisticsType>('flight');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);

  // Debounced autocomplete when formLoc changes (skip if change came from a selection).
  useEffect(() => {
    if (geoFromSelection.current) { geoFromSelection.current = false; return; }
    if (!formOpen || formLoc.trim().length < 2) { setSuggestions((prev) => (prev.length ? [] : prev)); return; }
    setGeoLoading(true);
    const t = setTimeout(async () => {
      const near = stopsRef.current.find((s) => s.latitude != null && s.longitude != null);
      const results = await suggestPlaces(
        formLoc,
        searchSession.current,
        near ? [near.longitude as number, near.latitude as number] : undefined,
      );
      setSuggestions(results);
      setGeoLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [formLoc, formOpen]);

  const refreshStops = () => queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });

  // Group the trip's real stops under their days.
  const days: BuilderDay[] = useMemo(
    () =>
      dayRows.map((d: TripDayRow) => ({
        id: d.id,
        n: d.day_number,
        place: d.place ?? '',
        date: d.date,
        stops: stops.filter((s) => s.day_id === d.id && !isLogistics(s)).sort((a, b) => a.sort_order - b.sort_order),
      })),
    [dayRows, stops],
  );
  const unassigned = useMemo(
    () => stops.filter((s) => s.day_id === null && !isLogistics(s)).sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );
  const flightStops = useMemo(
    () => stops.filter((s) => s.category === 'flight').sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );
  const stayStops = useMemo(
    () => stops.filter((s) => s.category === 'hotel').sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );

  const filteredDays = useMemo(
    () =>
      filterMemberId == null
        ? days
        : days.map((d) => ({
            ...d,
            stops: d.stops.filter(
              (s) => s.scope === 'shared' || (s.assignees ?? []).some((a) => a.id === filterMemberId),
            ),
          })),
    [days, filterMemberId],
  );
  const filteredUnassigned = useMemo(
    () =>
      filterMemberId == null
        ? unassigned
        : unassigned.filter(
            (s) => s.scope === 'shared' || (s.assignees ?? []).some((a) => a.id === filterMemberId),
          ),
    [unassigned, filterMemberId],
  );
  const filteredFlightStops = useMemo(
    () =>
      filterMemberId == null
        ? flightStops
        : flightStops.filter(
            (s) => s.scope === 'shared' || (s.assignees ?? []).some((a) => a.id === filterMemberId),
          ),
    [flightStops, filterMemberId],
  );
  const filteredStayStops = useMemo(
    () =>
      filterMemberId == null
        ? stayStops
        : stayStops.filter(
            (s) => s.scope === 'shared' || (s.assignees ?? []).some((a) => a.id === filterMemberId),
          ),
    [stayStops, filterMemberId],
  );

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormCoord(null);
    setFormLoc('');
    setFormCat('place');
    setFormStart('');
    setFormEnd('');
    setFormCost('');
    setFormNotes('');
    setFormPlaceId(null);
    setFormAssigneeIds([]);
    setSuggestions([]);
  };

  const pickSuggestion = async (s: Suggestion) => {
    geoFromSelection.current = true;
    setFormLoc(s.name);
    setFormPlaceId(s.mapbox_id);
    setSuggestions([]);
    const coord = await retrievePlace(s.mapbox_id, searchSession.current);
    if (coord) setFormCoord(coord);
    searchSession.current = newSessionToken(); // retrieve closes the session — start a fresh one
  };

  const openAdd = (dayId?: string, coord?: Coord, initialQuery?: string, initialCategory: Category = 'place') => {
    searchSession.current = newSessionToken();
    setEditing(null);
    setFormDayId(dayId);
    setFormCoord(coord ?? null);
    setFormLoc(initialQuery ?? '');
    setFormCat(initialCategory);
    setFormStart('');
    setFormEnd('');
    setFormCost('');
    setFormNotes('');
    setFormPlaceId(null);
    setFormAssigneeIds([]);
    setFormPaidBy(null);
    setSuggestions([]);
    setFormOpen(true);
  };

  const openBooking = (type: LogisticsType) => {
    setBookingType(type);
    setBookingOpen(true);
  };

  const openManualLogistics = (type: LogisticsType) => {
    setBookingOpen(false);
    openAdd(undefined, undefined, type === 'hotel' ? trip?.destination ?? '' : '', type);
  };

  const openInventory = (type: LogisticsType) => {
    router.push(`/inventory?type=${type}`);
  };

  const openEdit = (s: StopWithMedia) => {
    searchSession.current = newSessionToken();
    setEditing(s);
    setFormDayId(s.day_id ?? undefined);
    setFormCoord(s.latitude != null && s.longitude != null ? { latitude: s.latitude, longitude: s.longitude } : null);
    setFormLoc(s.location_name ?? '');
    setFormCat((CATEGORIES.includes(s.category as Category) ? (s.category as Category) : 'place'));
    setFormStart(s.planned_start ?? '');
    setFormEnd(s.planned_end ?? '');
    setFormCost(s.cost != null ? String(s.cost) : '');
    setFormNotes(s.notes ?? '');
    setFormPlaceId(s.place_id ?? null);
    setFormAssigneeIds((s.assignees ?? []).map((a) => a.id));
    setFormPaidBy(s.paid_by ?? null);
    setSuggestions([]);
    setFormOpen(true);
  };

  // Tapping the map drops a new stop there (the modal covers the map, so this
  // only fires when the form is closed).
  const onMapPress = (coord: Coord) => {
    if (!formOpen) openAdd(undefined, coord);
  };

  const submitForm = async () => {
    const name = formLoc.trim();
    if (!name || submitting) return;
    const parsedCost = formCost.trim() ? parseInt(formCost.replace(/[^0-9]/g, ''), 10) : NaN;
    const cost = Number.isFinite(parsedCost) ? parsedCost : null;
    setSubmitting(true);
    try {
      const scope = formAssigneeIds.length > 0 ? 'assigned' : 'shared';
      if (editing) {
        await updateStop(editing.id, {
          location_name: name,
          category: formCat,
          cost,
          scope,
          assignee_ids: formAssigneeIds,
          paid_by: cost != null ? formPaidBy : null,
          ...(formStart.trim() ? { planned_start: formStart.trim() } : {}),
          ...(formEnd.trim() ? { planned_end: formEnd.trim() } : {}),
          ...(formNotes.trim() ? { notes: formNotes.trim() } : {}),
          ...(formCoord ? { latitude: formCoord.latitude, longitude: formCoord.longitude } : {}),
          ...(formPlaceId ? { place_id: formPlaceId } : {}),
        });
        toast('Stop updated');
      } else {
        await createStop({
          trip_id: tripId,
          day_id: formDayId ?? null,
          user_id: userId,
          status: 'planned',
          category: formCat,
          location_name: name,
          latitude: formCoord?.latitude ?? null,
          longitude: formCoord?.longitude ?? null,
          place_id: formPlaceId ?? null,
          planned_start: formStart.trim() || null,
          planned_end: formEnd.trim() || null,
          duration_mins: null,
          cost,
          sort_order: formDayId
            ? (days.find(d => d.id === formDayId)?.stops.length ?? 0)
            : unassigned.length,
          notes: formNotes.trim() || null,
          caption: null,
          captured_at: null,
          batch_date: null,
          scope,
          ...(formAssigneeIds.length > 0 ? { assignee_ids: formAssigneeIds } : {}),
          ...(cost != null && formPaidBy ? { paid_by: formPaidBy } : {}),
        });
        toast('Stop added');
      }
      refreshStops();
      closeForm();
    } catch (e) {
      toast(editing ? 'Could not update stop' : 'Could not add stop');
    } finally {
      setSubmitting(false);
    }
  };

  const removeStop = async (stopId: string) => {
    try {
      await deleteStop(stopId);
      refreshStops();
      toast('Stop removed');
    } catch (e) {
      toast('Could not remove stop');
    }
  };

  const moveStop = async (arr: StopWithMedia[], si: number, dir: -1 | 1) => {
    const j = si + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[si];
    const b = arr[j];
    try {
      await Promise.all([
        updateStop(a.id, { sort_order: b.sort_order }),
        updateStop(b.id, { sort_order: a.sort_order }),
      ]);
      refreshStops();
    } catch {
      toast('Could not reorder');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const stopId = active.id as string;
    const targetKey = over.id as string;
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return;
    const currentKey = stop.day_id ? `day-${stop.day_id}` : 'unassigned';
    if (currentKey === targetKey) return;
    const newDayId = targetKey === 'unassigned' ? null : targetKey.replace('day-', '');
    const targetDay = newDayId ? days.find((d) => d.id === newDayId) : null;
    const newSortOrder = targetDay ? targetDay.stops.length : unassigned.length;
    try {
      await updateStop(stopId, { day_id: newDayId, sort_order: newSortOrder });
      refreshStops();
      toast(newDayId ? `Moved to Day ${targetDay?.n}` : 'Moved to Unsorted');
    } catch {
      toast('Could not move stop');
    }
  };

  // Selecting a stop (tapping its card or its map pin) scrolls the timeline to it.
  useEffect(() => {
    if (!selectedStopId) return;
    const stop = stops.find((s) => s.id === selectedStopId);
    if (!stop) return;
    const key = isLogistics(stop) ? 'logistics' : stop.day_id ? `day-${stop.day_id}` : 'unassigned';
    const y = sectionOffsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, [selectedStopId, stops]);

  const openDayEdit = (day: BuilderDay) => {
    setDayEditId(day.id);
    setDayPlace(day.place);
    setDayDate(day.date ?? '');
  };
  const closeDayEdit = () => { setDayEditId(null); setDayPlace(''); setDayDate(''); };
  const saveDayEdit = async () => {
    if (!dayEditId || daySaving) return;
    setDaySaving(true);
    try {
      await updateDay.mutateAsync({
        dayId: dayEditId,
        patch: { place: dayPlace.trim() || null, date: dayDate.trim() || null },
      });
      toast('Day updated');
      closeDayEdit();
    } catch {
      toast('Could not update day');
    } finally {
      setDaySaving(false);
    }
  };

  const deleteDayAction = async (day: BuilderDay) => {
    try {
      await deleteDay.mutateAsync(day.id);
      toast(`Day ${day.n} deleted. Stops moved to Unsorted.`);
    } catch {
      toast('Could not delete day');
    }
  };

  const confirmDeleteDay = (day: BuilderDay) => {
    const stopCount = day.stops.length;
    const copy = `Its ${stopCount} stop${stopCount === 1 ? '' : 's'} move to Unsorted \u2014 they won't be deleted.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Delete Day ${day.n}?\n\n${copy}`)) {
        void deleteDayAction(day);
      }
      return;
    }

    Alert.alert(`Delete Day ${day.n}?`, copy, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteDayAction(day) },
    ]);
  };

  const openBudget = () => {
    setBudgetInput(trip?.budget != null ? String(trip.budget) : '');
    setBudgetOpen(true);
  };
  const saveBudget = async (clear = false) => {
    if (budgetSaving) return;
    setBudgetSaving(true);
    try {
      const parsed = budgetInput.trim() ? parseInt(budgetInput.replace(/[^0-9]/g, ''), 10) : NaN;
      const budget = clear || !Number.isFinite(parsed) ? null : parsed;
      await updateTrip.mutateAsync({ budget });
      toast(budget == null ? 'Budget cleared' : 'Budget updated');
      setBudgetOpen(false);
    } catch {
      toast('Could not update budget');
    } finally {
      setBudgetSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await updateTrip.mutateAsync({ status: 'active', visibility: 'public' });
      toast('Trip published 🎉');
      router.push('/(tabs)/');
    } catch (e) {
      toast('Publish failed — please try again');
    }
  };

  if (tripLoading || stopsLoading || daysLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.acc} size="large" />
      </View>
    );
  }
  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Btn sm onPress={() => router.back()}>Go back</Btn>
      </View>
    );
  }

  const isOwner = trip.user_id === userId;
  const currency = trip.budget_currency ?? 'THB';
  const spent = stops.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const settlement = computeSettlement(stops, assigneeMembers);
  const myShare = Math.round(settlement.perMember.get(userId) ?? 0);
  const nameOf = (id: string) => {
    if (id === userId) return 'You';
    const m = assigneeMembers.find((x) => x.id === id);
    return m?.display_name ?? m?.username ?? 'Someone';
  };

  // Stops in itinerary order (days first, then unassigned) that have coordinates —
  // drives the numbered pins, their order labels, and the planned route line.
  type Pin = { id: string; latitude: number; longitude: number; location: string; caption: string; index?: number; photoUrl?: string };
  const orderedStops = [...days.flatMap((d) => d.stops), ...unassigned].filter(
    (s) => s.latitude != null && s.longitude != null,
  );
  const pins: Pin[] = orderedStops.map((s, i) => ({
    id: s.id,
    latitude: s.latitude as number,
    longitude: s.longitude as number,
    location: s.location_name ?? '',
    caption: s.notes ?? '',
    index: i + 1,
    photoUrl: s.media?.[0]?.cdn_url ?? s.media?.[0]?.url,
  }));
  const stayPins: Pin[] = stayStops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      location: s.location_name ?? 'Stay',
      caption: s.notes ?? 'Stay',
      photoUrl: s.media?.[0]?.cdn_url ?? s.media?.[0]?.url,
    }));
  pins.push(...stayPins);
  if (formCoord && !editing) {
    pins.push({ id: '__pending__', latitude: formCoord.latitude, longitude: formCoord.longitude, location: 'New stop', caption: '' });
  }
  const stopRoute = orderedStops.map((s) => [s.longitude as number, s.latitude as number] as [number, number]);
  // Sequence index per stop id (for the timeline card badges) — matches pin numbers.
  const orderIndex = new Map(orderedStops.map((s, i) => [s.id, i + 1]));
  const mapCenter = pins[0] ? { latitude: pins[0].latitude, longitude: pins[0].longitude } : null;
  const fallback = { latitude: 35.0116, longitude: 135.7681 };
  const firstDate = dayRows.find((d: TripDayRow) => d.date)?.date ?? null;
  const tripNights = Math.max(1, dayRows.length);
  const lastDate = trip.end_date ?? null;
  // "Suggest stays" needs an anchor (≥2 pinned attractions, excluding logistics) + a known date.
  const attractionPins = stops.filter(
    (s) => !['hotel', 'flight', 'transport'].includes(s.category) && s.latitude != null && s.longitude != null,
  );
  const canSuggest = attractionPins.length >= 2 && !!(firstDate ?? trip.start_date);

  const dragStop = dragActiveId ? stops.find((s) => s.id === dragActiveId) : null;

  const addDayAction = async () => {
    try {
      await addDay.mutateAsync();
      toast('Day added');
    } catch {
      toast('Could not add day');
    }
  };

  const timeline = (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setDragActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.stopsContent}>
        {assigneeMembers.length >= 2 && (
          <View style={styles.filterBar}>
            <MemberSwitcher
              members={assigneeMembers}
              selectedId={filterMemberId}
              onSelect={(id) => setFilterMemberId((prev) => (prev === id ? null : id))}
              currentUserId={userId}
            />
          </View>
        )}
        <View
          style={styles.logisticsRegion}
          onLayout={(e) => { sectionOffsets.current.logistics = e.nativeEvent.layout.y; }}
        >
          <LogisticsBlock
            title="Flights"
            type="flight"
            stops={filteredFlightStops}
            currency={currency}
            selectedStopId={selectedStopId}
            onAdd={openBooking}
            onInbox={openInventory}
            onSelect={setSelectedStopId}
            onEdit={openEdit}
            onRemove={removeStop}
            inboxCount={flightInventory.length}
          />
          <LogisticsBlock
            title="Stays"
            type="hotel"
            stops={filteredStayStops}
            currency={currency}
            selectedStopId={selectedStopId}
            onAdd={openBooking}
            onInbox={openInventory}
            onSelect={setSelectedStopId}
            onEdit={openEdit}
            onRemove={removeStop}
            inboxCount={stayInventory.length}
            onSuggest={canSuggest ? () => setRecsOpen(true) : undefined}
            onExplore={() => router.push(`/explore-stays?tripId=${tripId}`)}
          />
        </View>
        {days.length === 0 && unassigned.length === 0 ? (
          <View style={styles.emptyHero}>
            <Text style={styles.emptyHeroIcon}>🗺️</Text>
            <Text style={styles.emptyHeroTitle}>Plan {trip.destination ?? trip.title}</Text>
            <Text style={styles.emptyHeroSub}>Search for a place or tap the map to drop your first stop.</Text>
            <Btn solid onPress={() => openAdd(undefined, undefined, trip.destination ?? '')} style={styles.emptyHeroBtn}>
              ＋ Add your first stop
            </Btn>
            <PressableScale style={styles.emptyHeroDay} onPress={addDayAction}>
              <Text style={styles.emptyHeroDayText}>＋ Add a day to start a schedule</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            {filteredDays.map((day) => (
              <DroppableDaySection
                key={day.id}
                id={`day-${day.id}`}
                onLayout={(y) => { sectionOffsets.current[`day-${day.id}`] = y; }}
              >
                <View style={styles.currentDayHeader}>
                  <View style={styles.dayCircle}><Text style={styles.dayNum}>{day.n}</Text></View>
                  <PressableScale
                    style={styles.dayHeaderInfo}
                    onPress={() => openDayEdit(day)}
                    disabled={!isOwner}
                    accessibilityLabel={`Edit Day ${day.n}`}
                  >
                    <Text style={styles.currentDayTitle}>
                      Day {day.n}{day.place ? ` - ${day.place}` : ''}{isOwner ? '  Edit' : ''}
                    </Text>
                    <Text style={styles.currentDaySub}>{day.date ?? 'No date'} - {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}</Text>
                  </PressableScale>
                  <View style={styles.dayHeaderActions}>
                    {isOwner && (
                      <PressableScale
                        style={styles.deleteDayBtn}
                        onPress={() => confirmDeleteDay(day)}
                        accessibilityLabel={`Delete Day ${day.n}`}
                      >
                        <Text style={styles.deleteDayBtnText}>{'\u00d7'}</Text>
                      </PressableScale>
                    )}
                    <Btn sm onPress={() => openAdd(day.id)}>+ Add</Btn>
                  </View>
                </View>
                {day.stops.length === 0 && (
                  <Text style={styles.emptyHint}>
                    {filterMemberId != null ? 'No stops for this person.' : 'Drag stops here or tap + Add.'}
                  </Text>
                )}
                {day.stops.map((s, si) => (
                  <DraggableStopRow
                    key={s.id}
                    stop={s}
                    currency={currency}
                    index={orderIndex.get(s.id)}
                    selected={s.id === selectedStopId}
                    onSelect={() => setSelectedStopId(s.id)}
                    onEdit={() => openEdit(s)}
                    onRemove={() => removeStop(s.id)}
                    onUp={() => moveStop(day.stops, si, -1)}
                    onDown={() => moveStop(day.stops, si, 1)}
                    canUp={si > 0}
                    canDown={si < day.stops.length - 1}
                  />
                ))}
              </DroppableDaySection>
            ))}

            <DroppableDaySection id="unassigned" onLayout={(y) => { sectionOffsets.current['unassigned'] = y; }}>
              <View style={styles.unassignedHeader}>
                <Text style={styles.unassignedTitle}>Unsorted</Text>
                <Text style={styles.unassignedSub}>{filteredUnassigned.length} stop{filteredUnassigned.length !== 1 ? 's' : ''} - drag to a day</Text>
                <View style={{ flex: 1 }} />
                <Btn sm onPress={() => openAdd(undefined)}>+ Add</Btn>
              </View>
              {filteredUnassigned.length === 0 && (
                <Text style={styles.emptyHint}>
                  {filterMemberId != null ? 'No stops for this person.' : 'Stops from deleted days land here. Drag stops here to remove them from a day.'}
                </Text>
              )}
              {filteredUnassigned.map((s, si) => (
                <DraggableStopRow
                  key={s.id}
                  stop={s}
                  currency={currency}
                  index={orderIndex.get(s.id)}
                  selected={s.id === selectedStopId}
                  onSelect={() => setSelectedStopId(s.id)}
                  onEdit={() => openEdit(s)}
                  onRemove={() => removeStop(s.id)}
                  onUp={() => moveStop(filteredUnassigned, si, -1)}
                  onDown={() => moveStop(filteredUnassigned, si, 1)}
                  canUp={si > 0}
                  canDown={si < filteredUnassigned.length - 1}
                />
              ))}
            </DroppableDaySection>
            <PressableScale style={styles.addDayBtn} onPress={addDayAction}>
              <Text style={styles.addDayBtnText}>＋ Add day</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>

      <DragOverlay>
        {dragStop ? (
          <View style={styles.dragOverlay}>
            <StopCard stop={dragStop} currency={currency} index={orderIndex.get(dragStop.id)} onSelect={() => {}} onEdit={() => {}} onRemove={() => {}} onUp={() => {}} onDown={() => {}} canUp={false} canDown={false} />
          </View>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  const mapBlock = (
    <MapView
      initialLatitude={mapCenter?.latitude ?? fallback.latitude}
      initialLongitude={mapCenter?.longitude ?? fallback.longitude}
      initialZoom={12}
      posts={pins}
      route={stopRoute}
      activeId={selectedStopId}
      onSelectPost={setSelectedStopId}
      center={mapCenter}
      onMapPress={onMapPress}
    >
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoTitle}>{trip.title}</Text>
        <Text style={styles.routeInfoSub}>{stops.length} stop{stops.length !== 1 ? 's' : ''} · tap map to add</Text>
      </View>
    </MapView>
  );

  return (
    <View style={styles.root}>
      {/* toolbar */}
      <View style={styles.toolbar}>
        <Wordmark size={22} />
        {!isPhone && (
          <>
            <PressableScale onPress={() => router.back()}>
              <Text style={styles.back}>‹ back</Text>
            </PressableScale>
            <View style={styles.separator} />
          </>
        )}
        <Text style={styles.tripName} numberOfLines={1}>{trip.title}</Text>
        <View style={{ flex: 1 }} />
        {trip.budget != null ? (
          <PressableScale onPress={isOwner ? openBudget : undefined} disabled={!isOwner} accessibilityLabel="Edit budget">
            <View style={[styles.budgetChip, spent > trip.budget && styles.budgetChipOver]}>
              <Text style={[styles.budgetChipText, spent > trip.budget && styles.budgetChipTextOver]}>
                {spent.toLocaleString()} / {trip.budget.toLocaleString()} {currency}
                {assigneeMembers.length >= 2 ? `  · You ${myShare.toLocaleString()}` : ''}
              </Text>
            </View>
          </PressableScale>
        ) : isOwner ? (
          <PressableScale onPress={openBudget} accessibilityLabel="Add budget">
            <View style={styles.budgetAddChip}><Text style={styles.budgetAddText}>＋ Budget</Text></View>
          </PressableScale>
        ) : null}
        {!isPhone && <Chip dot={false}>✓ Auto-saved</Chip>}
        {assigneeMembers.length >= 2 && (
          <Btn sm onPress={() => setChatOpen(true)}>💬 Chat</Btn>
        )}
        <Btn sm onPress={() => setMembersOpen(true)}>👥 Friends</Btn>
        <Btn solid sm onPress={handlePublish} loading={updateTrip.isPending}>Publish</Btn>
        {isOwner && (
          <PressableScale onPress={() => setSettingsOpen(true)} accessibilityLabel="Trip settings">
            <View style={styles.settingsBtn}><Text style={styles.settingsBtnText}>⋯</Text></View>
          </PressableScale>
        )}
      </View>

      {/* forked draft banner */}
      {trip.forked_from_id && (
        <View style={styles.skimBanner}>
          <Text style={styles.skimBannerText}>
            ✦ Forked draft — edit freely. Add your own stays, flights & notes, then publish.
          </Text>
        </View>
      )}

      {isPhone ? (
        <View style={styles.phoneBody}>
          <View style={styles.timelineColPhone}>{timeline}</View>
          <MapSheet title="🗺  All stops">{mapBlock}</MapSheet>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.timelineCol}>{timeline}</View>
          <View style={styles.mapCol}>{mapBlock}</View>
        </View>
      )}

      <BookingSearchModal
        visible={bookingOpen}
        type={bookingType}
        tripId={tripId}
        destination={trip.destination}
        firstDate={firstDate}
        nights={tripNights}
        members={assigneeMembers}
        currentUserId={userId}
        onClose={() => setBookingOpen(false)}
        onBooked={() => {
          setBookingOpen(false);
          refreshStops();
          toast(bookingType === 'flight' ? 'Flight added to planner' : 'Stay added to planner');
        }}
        onManual={openManualLogistics}
      />

      <HotelRecsSheet
        visible={recsOpen}
        tripId={tripId}
        firstDate={firstDate}
        lastDate={lastDate}
        onClose={() => setRecsOpen(false)}
        onBooked={() => {
          setRecsOpen(false);
          refreshStops();
          toast('Stay added to planner');
        }}
      />

      {/* Add / edit stop modal */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={closeForm}>
        <PressableScale style={styles.modalBackdrop} onPress={closeForm}>
          <PressableScale style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit stop' : formDayId ? `Add a stop to Day ${days.find(d => d.id === formDayId)?.n}` : 'Add a stop'}
            </Text>

            <View style={styles.locStatus}>
              <Text style={styles.locStatusText}>
                {formCoord
                  ? '📍 Location pinned'
                  : editing
                    ? 'No location set'
                    : 'Tip: close and tap the map to pin a location'}
              </Text>
            </View>

            <Text style={styles.modalLabel}>Place</Text>
            <View style={styles.geoWrap}>
              <TextInput
                style={styles.input}
                placeholder="Search or type a place name…"
                placeholderTextColor={colors.sub}
                value={formLoc}
                onChangeText={(t) => { setFormLoc(t); setFormPlaceId(null); }}
                autoFocus
              />
              {geoLoading && (
                <Text style={styles.geoHint}>Searching…</Text>
              )}
              {suggestions.length > 0 && (
                <View style={styles.geoDropdown}>
                  {suggestions.map((s) => (
                    <PressableScale key={s.mapbox_id} style={styles.geoItem} onPress={() => pickSuggestion(s)}>
                      <Text style={styles.geoItemTitle} numberOfLines={1}>{s.name}</Text>
                      {s.place_formatted ? <Text style={styles.geoItemSub} numberOfLines={1}>{s.place_formatted}</Text> : null}
                    </PressableScale>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <PressableScale key={c} onPress={() => setFormCat(c)}>
                  <Chip dot={false} accent={c === formCat}>{c}</Chip>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.modalLabel}>Time (optional)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Start  09:00"
                placeholderTextColor={colors.sub}
                value={formStart}
                onChangeText={setFormStart}
              />
              <Text style={styles.timeSep}>–</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="End  11:00"
                placeholderTextColor={colors.sub}
                value={formEnd}
                onChangeText={setFormEnd}
              />
            </View>

            <Text style={styles.modalLabel}>Cost (optional)</Text>
            <View style={styles.budgetRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. 1200"
                placeholderTextColor={colors.sub}
                value={formCost}
                onChangeText={setFormCost}
                keyboardType="numeric"
              />
              <View style={styles.currencyTag}><Text style={styles.currencyTagText}>{currency}</Text></View>
            </View>

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Anything to remember…"
              placeholderTextColor={colors.sub}
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
            />

            <WhoForControl
              members={assigneeMembers}
              assigneeIds={formAssigneeIds}
              onChange={setFormAssigneeIds}
              currentUserId={userId}
            />

            {formCost.trim() !== '' && (
              <PaidByControl
                members={assigneeMembers}
                paidBy={formPaidBy}
                onChange={setFormPaidBy}
                currentUserId={userId}
              />
            )}

            <View style={styles.modalActions}>
              <Btn sm onPress={closeForm}>Cancel</Btn>
              <Btn solid sm onPress={submitForm} loading={submitting} disabled={!formLoc.trim()}>
                {editing ? 'Save' : 'Add stop'}
              </Btn>
            </View>
          </PressableScale>
        </PressableScale>
      </Modal>

      {/* Edit day modal */}
      <Modal visible={dayEditId !== null} transparent animationType="fade" onRequestClose={closeDayEdit}>
        <PressableScale style={styles.modalBackdrop} onPress={closeDayEdit}>
          <PressableScale style={[styles.modalSheet, { maxWidth: 380 }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Edit day</Text>

            <Text style={styles.modalLabel}>Label (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kyoto — temples & tea"
              placeholderTextColor={colors.sub}
              value={dayPlace}
              onChangeText={setDayPlace}
              autoFocus
            />

            <Text style={styles.modalLabel}>Date (optional)</Text>
            <DatePicker value={dayDate || null} onChange={(d) => setDayDate(d ?? '')} />

            <View style={styles.modalActions}>
              <Btn sm onPress={closeDayEdit}>Cancel</Btn>
              <Btn solid sm onPress={saveDayEdit} loading={daySaving}>Save</Btn>
            </View>
          </PressableScale>
        </PressableScale>
      </Modal>

      {/* Budget modal */}
      <Modal visible={budgetOpen} transparent animationType="fade" onRequestClose={() => setBudgetOpen(false)}>
        <PressableScale style={styles.modalBackdrop} onPress={() => setBudgetOpen(false)}>
          <PressableScale style={[styles.modalSheet, { maxWidth: 360 }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Trip budget</Text>
            <Text style={styles.modalLabel}>Total budget (optional)</Text>
            <View style={styles.budgetRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. 40000"
                placeholderTextColor={colors.sub}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                autoFocus
              />
              <View style={styles.currencyTag}><Text style={styles.currencyTagText}>{currency}</Text></View>
            </View>
            <Text style={styles.emptyHint}>Per-stop costs add up against this.</Text>

            {assigneeMembers.length >= 2 && spent > 0 && (
              <View style={styles.shareBreakdown}>
                <Text style={styles.shareBreakdownTitle}>Each person's share</Text>
                {assigneeMembers.map((m) => {
                  const share = Math.round(settlement.perMember.get(m.id) ?? 0);
                  const label = m.id === userId ? 'You' : m.display_name ?? m.username;
                  return (
                    <View key={m.id} style={styles.shareRow}>
                      <Text style={styles.shareLabel}>{label}</Text>
                      <Text style={[styles.shareAmount, m.id === userId && styles.shareAmountYou]}>
                        {share.toLocaleString()} {currency}
                      </Text>
                    </View>
                  );
                })}

                <Text style={[styles.shareBreakdownTitle, { marginTop: spacing.sm }]}>Settle up</Text>
                {settlement.transfers.length === 0 ? (
                  <Text style={styles.settleAllEven}>All square — nobody owes anything.</Text>
                ) : (
                  settlement.transfers.map((t, i) => {
                    const involvesYou = t.from === userId || t.to === userId;
                    return (
                      <View key={i} style={styles.shareRow}>
                        <Text style={[styles.settleLabel, involvesYou && styles.shareAmountYou]}>
                          {nameOf(t.from)} → {nameOf(t.to)}
                        </Text>
                        <Text style={[styles.shareAmount, involvesYou && styles.shareAmountYou]}>
                          {t.amount.toLocaleString()} {currency}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              {trip.budget != null && <Btn sm onPress={() => saveBudget(true)}>Clear</Btn>}
              <Btn sm onPress={() => setBudgetOpen(false)}>Cancel</Btn>
              <Btn solid sm onPress={() => saveBudget(false)} loading={budgetSaving}>Save</Btn>
            </View>
          </PressableScale>
        </PressableScale>
      </Modal>

      <TripMembersModal
        tripId={tripId}
        isOwner={trip.user_id === userId}
        visible={membersOpen}
        onClose={() => setMembersOpen(false)}
      />

      <TripChatModal tripId={tripId} visible={chatOpen} onClose={() => setChatOpen(false)} />

      <TripSettingsMenu
        visible={settingsOpen}
        trip={{
          id: trip.id,
          title: trip.title,
          visibility: trip.visibility,
          status: trip.status,
          transport_mode: trip.transport_mode,
          user_id: trip.user_id,
        }}
        onClose={() => setSettingsOpen(false)}
        onDeleted={() => router.replace('/(tabs)/trips')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  skimBanner: {
    backgroundColor: colors.accSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.acc,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  skimBannerText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: fontSize.lg, color: colors.sub },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  back: { color: colors.sub, fontSize: fontSize.sm },
  separator: { width: 1, height: 20, backgroundColor: colors.line, marginHorizontal: 4 },
  tripName: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink, flexShrink: 1 },

  budgetChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line,
  },
  budgetChipOver: { backgroundColor: 'rgba(192,57,43,0.10)', borderColor: '#c0392b' },
  budgetChipText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.ink },
  budgetChipTextOver: { color: '#c0392b' },
  budgetAddChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
  },
  budgetAddText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.acc },

  settingsBtn: {
    width: 34, height: 34, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsBtnText: { fontSize: 18, color: colors.ink, fontWeight: '700', lineHeight: 20 },

  emptyHero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyHeroIcon: { fontSize: 40 },
  emptyHeroTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  emptyHeroSub: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', maxWidth: 300, marginBottom: spacing.sm },
  emptyHeroBtn: { marginTop: spacing.xs },
  emptyHeroDay: { marginTop: spacing.sm, paddingVertical: spacing.sm },
  emptyHeroDayText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },

  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currencyTag: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.panel,
  },
  currencyTagText: { fontSize: fontSize.md, color: colors.sub, fontWeight: '600' },

  body: { flex: 1, flexDirection: 'row' },
  phoneBody: { flex: 1 },

  timelineCol: {
    width: 440,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    flexShrink: 0,
    flexDirection: 'column',
  },
  timelineColPhone: { flex: 1 },

  droppable: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  droppableOver: {
    borderColor: colors.acc,
    backgroundColor: colors.accSoft,
  },
  unassignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  unassignedTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  unassignedSub: { fontSize: fontSize.xs, color: colors.sub },

  dragHandle: { width: 20, alignItems: 'center', justifyContent: 'center', cursor: 'grab' as any },
  dragHandleIcon: { fontSize: 16, color: colors.bar },
  stopRowDragging: { opacity: 0.3 },
  dragOverlay: {
    ...shadow.md,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.sm,
  },

  currentDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
  dayHeaderInfo: { flex: 1, gap: 2 },
  dayHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteDayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  deleteDayBtnText: { fontSize: fontSize.lg, lineHeight: 22, color: colors.sub, fontWeight: '700' },
  currentDayTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  currentDaySub: { fontSize: fontSize.xs, color: colors.sub },

  stopsContent: { padding: spacing.lg, gap: 0 },
  filterBar: { flexDirection: 'row', paddingBottom: spacing.md },
  logisticsRegion: { gap: spacing.sm, marginBottom: spacing.md },
  logisticsBlock: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    overflow: 'hidden',
  },
  logisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  logisticsTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logisticsHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logisticsTitle: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  logisticsCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logisticsCountText: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800' },
  inboxBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accSoft,
    borderWidth: 1,
    borderColor: colors.acc,
  },
  inboxBadgeText: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '800' },
  logisticsEmpty: { padding: spacing.lg },
  logisticsEmptyText: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center' },
  logisticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  logisticsCardSelected: { backgroundColor: colors.accSoft },
  logisticsMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logisticsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accSoft,
    borderWidth: 1,
    borderColor: colors.acc,
  },
  logisticsIconText: { fontSize: 18 },
  logisticsSubtotal: { fontSize: fontSize.xs, color: colors.ink, fontWeight: '800' },
  logisticsMeta: { flex: 1, gap: 3 },
  logisticsName: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '800' },
  logisticsDetail: { fontSize: fontSize.xs, color: colors.sub, lineHeight: 16 },
  logisticsCost: { fontSize: fontSize.xs, color: colors.ink, fontWeight: '700' },
  logisticsActions: { alignItems: 'center', gap: spacing.xs },
  emptyHint: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.lg },

  stopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  railCol: { width: 16, alignItems: 'center', paddingTop: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper },
  railDotActive: { borderColor: colors.acc, backgroundColor: colors.acc },
  railLine: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2, minHeight: 16 },

  stopCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stopCardSelected: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  stopMain: { flexDirection: 'row', gap: spacing.md, flex: 1 },
  stopPhoto: { width: 72, height: 72, backgroundColor: colors.panel, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopIndex: {
    position: 'absolute', top: -6, left: -6,
    minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11,
    backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.paper,
  },
  stopIndexText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '800' },
  stopPhotoLabel: { fontSize: 10, color: colors.sub, fontFamily: 'monospace' },
  stopPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  stopMeta: { flex: 1, gap: 4 },
  stopLocation: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  stopMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  stopCat: { alignSelf: 'flex-start' },
  stopTime: { alignSelf: 'flex-start' },
  stopCost: { alignSelf: 'flex-start' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeSep: { color: colors.sub, fontSize: fontSize.md },
  geoWrap: { position: 'relative' },
  geoHint: { fontSize: fontSize.xs, color: colors.sub, marginTop: 4 },
  geoDropdown: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginTop: 4,
    ...shadow.sm,
  },
  geoItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  geoItemTitle: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  geoItemSub: { fontSize: fontSize.xs, color: colors.sub, marginTop: 2 },
  stopCaption: { fontSize: fontSize.xs, color: colors.sub, lineHeight: 16 },
  noLoc: { fontSize: fontSize.xs, color: colors.acc },
  shareBreakdown: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: 6 },
  shareBreakdownTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareLabel: { fontSize: fontSize.sm, color: colors.ink },
  shareAmount: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '600' },
  shareAmountYou: { color: colors.acc },
  settleLabel: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  settleAllEven: { fontSize: fontSize.xs, color: colors.sub, fontStyle: 'italic' },
  assigneeRow: { flexDirection: 'row', marginTop: 4 },
  assigneeAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.panel, marginRight: -4, borderWidth: 1.5, borderColor: colors.paper },
  assigneeAvatarFallback: { alignItems: 'center' as const, justifyContent: 'center' as const },
  assigneeInitial: { fontSize: 9, fontWeight: '700' as const, color: colors.sub },

  stopActions: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 4 },
  editIcon: { fontSize: fontSize.sm, color: colors.sub },
  reorderIcon: { fontSize: 12, color: colors.sub },
  reorderDisabled: { color: colors.line },
  removeBtnText: { fontSize: fontSize.sm, color: colors.sub },

  addDayBtn: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.acc,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  addDayBtnText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '700' },

  addZone: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addZoneText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalSheet: { width: '100%', maxWidth: 440, backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  locStatus: { backgroundColor: colors.panel, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  locStatusText: { fontSize: fontSize.sm, color: colors.ink },
  modalLabel: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },

  mapCol: { flex: 1 },
  routeInfo: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: colors.paper,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
    ...shadow.sm,
  },
  routeInfoTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  routeInfoSub: { fontSize: fontSize.xs, color: colors.sub },
});

