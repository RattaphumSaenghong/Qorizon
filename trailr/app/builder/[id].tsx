/**
 * Trip Builder — day timeline + route map.
 * Build a plan: tap the map to drop stops, edit/reorder them, then publish.
 *
 * Leaf components live in src/builder/components, shared helpers/types in
 * src/builder/helpers, and the StyleSheet in src/builder/styles.
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { CoverImage } from '../../src/components/CoverImage';
import { MapView } from '../../src/components/MapView';
import { MapSheet } from '../../src/components/MapSheet';
import { PressableScale } from '../../src/components/PressableScale';
import { useBookings, useCreateBooking, useHotelRecommendations, useInventory, useLikedStops, useSaved, useTrip, useTripStops, useUpdateTrip, useAddTripDay, useUpdateTripDay, useDeleteTripDay, fetchTripDays, fetchBooking, createStop, updateStop, deleteStop, useTripMembers } from '@trailr/db';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { BookingRow, HotelRecommendation, StopWithMedia, TripDayRow } from '@trailr/db';
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
import { computeSettlement } from '../../src/lib/budget';
import { flightSummaryFromMeta } from '../../src/lib/bookingDisplay';
import { suggestPlaces, retrievePlace, newSessionToken } from '../../src/lib/places';
import { styles } from '../../src/builder/styles';
import { StopCard, DroppableDaySection, DraggableStopRow, LogisticsBlock } from '../../src/builder/components';
import {
  CATEGORIES,
  STAY_SORTS,
  sortStayRecs,
  stayPriceLabel,
  parsePositiveInt,
  bookingTitle,
  isLogistics,
  type Category,
  type LogisticsType,
  type StaySort,
  type BuilderSideTab,
  type BuilderDay,
  type Coord,
  type Suggestion,
} from '../../src/builder/helpers';

function flightTimeFromIso(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:T|\s)(\d{2}:\d{2})/) ?? value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? null;
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
  const { data: savedItems = [] } = useSaved();
  const { data: likedStops = [] } = useLikedStops();
  const { data: bookedItems = [] } = useBookings();
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
  // Latest filtered lists, read by the stable reorder handler (moveStopById).
  const filteredRef = useRef<{ days: BuilderDay[]; unassigned: StopWithMedia[] }>({ days: [], unassigned: [] });
  const [submitting, setSubmitting] = useState(false);
  const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
  const [formPaidBy, setFormPaidBy] = useState<string | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<LogisticsType>('flight');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [sideTabs, setSideTabs] = useState<BuilderSideTab[]>([]);
  const [activeSideTab, setActiveSideTab] = useState<BuilderSideTab>('stays');
  const [staySearchActive, setStaySearchActive] = useState(false);
  const [stayCheckIn, setStayCheckIn] = useState('');
  const [stayCheckOut, setStayCheckOut] = useState('');
  const [stayGuests, setStayGuests] = useState('2');
  const [stayNightlyCap, setStayNightlyCap] = useState('');
  const [staySort, setStaySort] = useState<StaySort>('score');
  const [selectedStayOfferId, setSelectedStayOfferId] = useState<string | null>(null);
  const [hoveredStayOfferId, setHoveredStayOfferId] = useState<string | null>(null);
  const [addingStayOfferId, setAddingStayOfferId] = useState<string | null>(null);
  const [addingBackpackId, setAddingBackpackId] = useState<string | null>(null);

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

  const refreshStops = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] }),
    [queryClient, tripId],
  );

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
  filteredRef.current = { days: filteredDays, unassigned: filteredUnassigned };
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
  const backpackStops = useMemo(() => {
    const byId = new Map<string, StopWithMedia>();
    for (const item of savedItems) {
      if (item.stop?.location_name && item.stop.latitude != null && item.stop.longitude != null) {
        byId.set(item.stop.id, item.stop);
      }
    }
    for (const stop of likedStops) {
      if (stop.location_name && stop.latitude != null && stop.longitude != null) {
        byId.set(stop.id, stop);
      }
    }
    return [...byId.values()];
  }, [likedStops, savedItems]);
  const stayPanelOpen = sideTabs.includes('stays');
  const sidePanelOpen = sideTabs.length > 0;
  const firstDate = dayRows.find((d: TripDayRow) => d.date)?.date ?? trip?.start_date ?? null;
  const tripNights = Math.max(1, dayRows.length);
  const lastDate = trip?.end_date ?? null;
  const stayParams = useMemo(
    () => ({
      check_in: stayCheckIn.trim() || firstDate || undefined,
      check_out: stayCheckOut.trim() || lastDate || undefined,
      guests: parsePositiveInt(stayGuests),
      nightly_cap: parsePositiveInt(stayNightlyCap),
    }),
    [firstDate, lastDate, stayCheckIn, stayCheckOut, stayGuests, stayNightlyCap],
  );
  const stayRecsQ = useHotelRecommendations(tripId, stayParams, stayPanelOpen && staySearchActive);
  const createStayBooking = useCreateBooking(tripId);
  const stayItems = useMemo(
    () => sortStayRecs(stayRecsQ.data?.items ?? [], staySort),
    [stayRecsQ.data?.items, staySort],
  );

  useEffect(() => {
    if (!stayCheckIn && firstDate) setStayCheckIn(firstDate);
    if (!stayCheckOut && lastDate) setStayCheckOut(lastDate);
  }, [firstDate, lastDate, stayCheckIn, stayCheckOut]);

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

  const openBooking = useCallback((type: LogisticsType) => {
    setBookingType(type);
    setBookingOpen(true);
  }, []);

  const openSideTab = useCallback((tab: BuilderSideTab) => {
    setSideTabs((prev) => (prev.includes(tab) ? prev : [...prev, tab]));
    setActiveSideTab(tab);
  }, []);

  const closeSideTab = (tab: BuilderSideTab) => {
    setSideTabs((prev) => {
      const next = prev.filter((t) => t !== tab);
      if (activeSideTab === tab) setActiveSideTab(next[next.length - 1] ?? 'stays');
      return next;
    });
    if (tab === 'stays') {
      setSelectedStayOfferId(null);
      setHoveredStayOfferId(null);
    }
  };

  const openStaySearch = useCallback(() => {
    openSideTab('stays');
    setStaySearchActive(true);
  }, [openSideTab]);

  const openStaysExplore = useCallback(
    () => router.push(`/book/stays?tripId=${tripId}`),
    [router, tripId],
  );

  const openManualLogistics = (type: LogisticsType) => {
    setBookingOpen(false);
    openAdd(undefined, undefined, type === 'hotel' ? trip?.destination ?? '' : '', type);
  };

  const openInventory = useCallback((type: LogisticsType) => {
    router.push(`/inventory?type=${type}`);
  }, [router]);

  const addBackpackStop = async (stop: StopWithMedia) => {
    if (addingBackpackId) return;
    setAddingBackpackId(`post:${stop.id}`);
    try {
      await createStop({
        trip_id: tripId,
        day_id: null,
        user_id: userId,
        status: 'planned',
        category: (CATEGORIES.includes(stop.category as Category) ? stop.category : 'place') as Category,
        location_name: stop.location_name ?? 'Saved place',
        latitude: stop.latitude ?? null,
        longitude: stop.longitude ?? null,
        place_id: stop.place_id ?? null,
        planned_start: null,
        planned_end: null,
        duration_mins: null,
        cost: null,
        sort_order: unassigned.length,
        notes: 'from this post',
        caption: null,
        captured_at: null,
        batch_date: null,
        scope: 'shared',
      });
      refreshStops();
      toast('Location added to Unsorted');
    } catch {
      toast('Could not add location');
    } finally {
      setAddingBackpackId(null);
    }
  };

  const addBackpackBooking = async (booking: BookingRow) => {
    if (addingBackpackId) return;
    setAddingBackpackId(`booking:${booking.id}`);
    try {
      const detail = booking.type === 'flight' ? await fetchBooking(booking.id) : null;
      const flightSummary = detail ? flightSummaryFromMeta(detail.meta) : null;
      await createStop({
        trip_id: tripId,
        day_id: null,
        user_id: userId,
        status: 'planned',
        category: booking.type,
        location_name: bookingTitle(booking),
        latitude: null,
        longitude: null,
        place_id: null,
        planned_start: flightTimeFromIso(flightSummary?.dep_at),
        planned_end: flightTimeFromIso(flightSummary?.arr_at),
        duration_mins: null,
        cost: booking.amount_thb == null ? null : Math.round(booking.amount_thb),
        sort_order: unassigned.length,
        notes: 'from booking',
        meta: flightSummary as unknown as Record<string, unknown> | null,
        caption: null,
        captured_at: null,
        batch_date: null,
        scope: 'shared',
      });
      refreshStops();
      toast('Booking added to Unsorted');
    } catch (error) {
      const message = String(error);
      toast(message.includes('outside this trip') ? 'That flight is outside this trip date range' : 'Could not add booking');
    } finally {
      setAddingBackpackId(null);
    }
  };

  const addRecommendedStay = (rec: HotelRecommendation) => {
    setAddingStayOfferId(rec.offer_id);
    createStayBooking.mutate(
      {
        type: 'hotel',
        provider: rec.provider,
        trip_id: tripId,
        external_ref: rec.offer_id,
        amount_thb: rec.total_thb,
        title: rec.name,
        meta: {
          nightly_thb: rec.nightly_thb,
          latitude: rec.latitude,
          longitude: rec.longitude,
          ...(rec.station_name ? { station_name: rec.station_name } : {}),
          ...(rec.station_meters != null ? { station_meters: rec.station_meters } : {}),
        },
      },
      {
        onSuccess: () => {
          refreshStops();
          toast('Stay added to planner');
        },
        onError: () => toast('Could not add stay'),
        onSettled: () => setAddingStayOfferId(null),
      },
    );
  };

  const openEdit = useCallback((s: StopWithMedia) => {
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
  }, []);

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

  const removeStop = useCallback(async (stopId: string) => {
    try {
      await deleteStop(stopId);
      refreshStops();
      toast('Stop removed');
    } catch (e) {
      toast('Could not remove stop');
    }
  }, [refreshStops, toast]);

  const moveStop = useCallback(async (arr: StopWithMedia[], si: number, dir: -1 | 1) => {
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
  }, [refreshStops, toast]);

  // Reorder by stop id (stable handler for the memoized rows). Reads the current
  // filtered day/unassigned lists from a ref so reorder respects the member filter,
  // matching the per-row up/down behaviour without recreating handlers each render.
  const moveStopById = useCallback((stopId: string, dir: -1 | 1) => {
    const stop = stopsRef.current.find((s) => s.id === stopId);
    if (!stop) return;
    const arr = stop.day_id
      ? (filteredRef.current.days.find((d) => d.id === stop.day_id)?.stops ?? [])
      : filteredRef.current.unassigned;
    const si = arr.findIndex((s) => s.id === stopId);
    if (si < 0) return;
    void moveStop(arr, si, dir);
  }, [moveStop]);

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
  type Pin = {
    id: string;
    latitude: number;
    longitude: number;
    location: string;
    caption: string;
    index?: number;
    photoUrl?: string;
    priceLabel?: string;
    markerKind?: 'visited' | 'planned';
  };
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
  const staySearchPins: Pin[] =
    stayPanelOpen && staySearchActive
      ? stayItems.map((rec) => ({
          id: `stay:${rec.offer_id}`,
          latitude: rec.latitude,
          longitude: rec.longitude,
          location: rec.name,
          caption: rec.why,
          priceLabel: stayPriceLabel(rec.nightly_thb),
          markerKind: 'planned',
        }))
      : [];
  pins.push(...staySearchPins);
  if (formCoord && !editing) {
    pins.push({ id: '__pending__', latitude: formCoord.latitude, longitude: formCoord.longitude, location: 'New stop', caption: '' });
  }
  const stopRoute = orderedStops.map((s) => [s.longitude as number, s.latitude as number] as [number, number]);
  // Sequence index per stop id (for the timeline card badges) — matches pin numbers.
  const orderIndex = new Map(orderedStops.map((s, i) => [s.id, i + 1]));
  const mapCenter = pins[0] ? { latitude: pins[0].latitude, longitude: pins[0].longitude } : null;
  const fallback = { latitude: 35.0116, longitude: 135.7681 };
  const activeStayId = hoveredStayOfferId ?? selectedStayOfferId;
  const mapActiveId = activeStayId ? `stay:${activeStayId}` : selectedStopId;

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
            onAdd={openStaySearch}
            onInbox={openInventory}
            onSelect={setSelectedStopId}
            onEdit={openEdit}
            onRemove={removeStop}
            inboxCount={stayInventory.length}
            onExplore={openStaysExplore}
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
                    onSelect={setSelectedStopId}
                    onEdit={openEdit}
                    onRemove={removeStop}
                    onMove={moveStopById}
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
                  onSelect={setSelectedStopId}
                  onEdit={openEdit}
                  onRemove={removeStop}
                  onMove={moveStopById}
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

  const stayTabContent = (
    <>
      <View style={styles.sidePanelHeader}>
        <View style={styles.stayPanelTitleWrap}>
          <Text style={styles.stayPanelTitle}>Stays</Text>
          <Text style={styles.stayPanelSub}>
            {stayRecsQ.isFetching
              ? 'Searching...'
              : staySearchActive && stayRecsQ.data
                ? `${stayItems.length} ranked - ${stayRecsQ.data.nights} night${stayRecsQ.data.nights === 1 ? '' : 's'}`
                : 'Ranked for this trip'}
          </Text>
        </View>
      </View>

      <View style={styles.stayFilters}>
        <View style={styles.stayFilterRow}>
          <View style={styles.stayField}>
            <Text style={styles.stayLabel}>Check-in</Text>
            <TextInput
              style={styles.stayInput}
              value={stayCheckIn}
              onChangeText={setStayCheckIn}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.sub}
            />
          </View>
          <View style={styles.stayField}>
            <Text style={styles.stayLabel}>Check-out</Text>
            <TextInput
              style={styles.stayInput}
              value={stayCheckOut}
              onChangeText={setStayCheckOut}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.sub}
            />
          </View>
        </View>
        <View style={styles.stayFilterRow}>
          <View style={styles.stayFieldSmall}>
            <Text style={styles.stayLabel}>Guests</Text>
            <TextInput
              style={styles.stayInput}
              value={stayGuests}
              onChangeText={setStayGuests}
              keyboardType="numeric"
              placeholder="2"
              placeholderTextColor={colors.sub}
            />
          </View>
          <View style={styles.stayField}>
            <Text style={styles.stayLabel}>Max/night</Text>
            <TextInput
              style={styles.stayInput}
              value={stayNightlyCap}
              onChangeText={setStayNightlyCap}
              keyboardType="numeric"
              placeholder={stayRecsQ.data?.nightly_cap_thb != null ? stayRecsQ.data.nightly_cap_thb.toLocaleString() : 'No cap'}
              placeholderTextColor={colors.sub}
            />
          </View>
          <Btn
            sm
            solid
            onPress={() => {
              setStaySearchActive(true);
              if (staySearchActive) void stayRecsQ.refetch();
            }}
            loading={stayRecsQ.isFetching}
          >
            Search
          </Btn>
        </View>
      </View>

      <View style={styles.staySortRow}>
        {STAY_SORTS.map((s) => (
          <PressableScale
            key={s.key}
            style={[styles.staySortChip, staySort === s.key && styles.staySortChipActive]}
            onPress={() => setStaySort(s.key)}
            accessibilityLabel={`Sort stays by ${s.label}`}
          >
            <Text style={[styles.staySortText, staySort === s.key && styles.staySortTextActive]}>{s.label}</Text>
          </PressableScale>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.stayList}>
        {stayRecsQ.isError ? (
          <Text style={styles.stayEmpty}>Could not load stays. Check the API and try again.</Text>
        ) : stayRecsQ.isFetching && !stayRecsQ.data ? (
          <ActivityIndicator color={colors.acc} style={styles.stayLoading} />
        ) : stayRecsQ.data?.multi_area ? (
          <View style={styles.stayNotice}>
            <Text style={styles.stayNoticeTitle}>Too spread out for one stay</Text>
            <Text style={styles.stayNoticeText}>Split the trip into areas, then search stays for each area.</Text>
          </View>
        ) : staySearchActive && stayItems.length === 0 ? (
          <Text style={styles.stayEmpty}>Add at least two pinned attractions and trip dates, then search again.</Text>
        ) : !staySearchActive ? (
          <Text style={styles.stayEmpty}>Search to see ranked stays on the map.</Text>
        ) : (
          stayItems.map((rec) => {
            const active = rec.offer_id === selectedStayOfferId || rec.offer_id === hoveredStayOfferId;
            return (
              <PressableScale
                key={rec.offer_id}
                style={[styles.stayCard, active && styles.stayCardActive]}
                onPress={() => setSelectedStayOfferId(rec.offer_id)}
                onHoverIn={() => setHoveredStayOfferId(rec.offer_id)}
                onHoverOut={() => setHoveredStayOfferId(null)}
                accessibilityLabel={`Select ${rec.name}`}
              >
                <View style={styles.stayCardMain}>
                  <View style={styles.stayCardTop}>
                    <Text style={styles.stayName} numberOfLines={1}>{rec.name}</Text>
                    <Text style={styles.stayScore}>{Math.round(rec.score * 100)}</Text>
                  </View>
                  <Text style={styles.stayWhy} numberOfLines={2}>{rec.why}</Text>
                  <View style={styles.stayMetaRow}>
                    <Chip dot={false}>{`${rec.nightly_thb.toLocaleString()} THB/night`}</Chip>
                    <Chip dot={false}>{`${rec.avg_km_to_stops} km avg`}</Chip>
                    {rec.rating != null ? <Chip dot={false}>{`Rating ${rec.rating}`}</Chip> : null}
                  </View>
                </View>
                <Btn
                  sm
                  solid
                  onPress={() => addRecommendedStay(rec)}
                  loading={addingStayOfferId === rec.offer_id}
                >
                  Add
                </Btn>
              </PressableScale>
            );
          })
        )}
      </ScrollView>
    </>
  );

  const backpackTabContent = (
    <>
      <View style={styles.sidePanelHeader}>
        <View style={styles.stayPanelTitleWrap}>
          <Text style={styles.stayPanelTitle}>Backpack</Text>
          <Text style={styles.stayPanelSub}>Saved, liked, and booked things you can bring into this trip.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.backpackContent}>
        <View style={styles.backpackSection}>
          <Text style={styles.backpackSectionTitle}>Post locations</Text>
          {backpackStops.length === 0 ? (
            <Text style={styles.backpackEmpty}>Like or save posts with locations to bring them here.</Text>
          ) : (
            backpackStops.map((stop) => {
              const photoUri = stop.media?.[0]?.cdn_url ?? stop.media?.[0]?.url;
              return (
                <View key={stop.id} style={styles.backpackCard}>
                  <View style={styles.backpackPhoto}>
                    <CoverImage
                      uri={photoUri}
                      style={styles.backpackPhotoImg}
                      labelStyle={styles.backpackPhotoLabel}
                      label="post"
                    />
                  </View>
                  <View style={styles.backpackCardMain}>
                    <Text style={styles.backpackName} numberOfLines={1}>{stop.location_name ?? 'Saved place'}</Text>
                    <Text style={styles.backpackMeta} numberOfLines={1}>from this post</Text>
                    {stop.caption || stop.notes ? (
                      <Text style={styles.backpackCopy} numberOfLines={2}>{stop.caption ?? stop.notes}</Text>
                    ) : null}
                  </View>
                  <Btn
                    sm
                    solid
                    onPress={() => void addBackpackStop(stop)}
                    loading={addingBackpackId === `post:${stop.id}`}
                  >
                    Add
                  </Btn>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.backpackSection}>
          <Text style={styles.backpackSectionTitle}>Bookings</Text>
          {bookedItems.length === 0 ? (
            <Text style={styles.backpackEmpty}>Booked hotels and flights will show up here.</Text>
          ) : (
            bookedItems.map((booking) => {
              const isFlight = booking.type === 'flight';
              const flightCopy = isFlight ? 'Schedule locks when added' : null;
              return (
                <View key={booking.id} style={styles.backpackCard}>
                  <View style={[styles.backpackBookingIcon, isFlight && styles.backpackFlightIcon]}>
                    <Text style={styles.backpackBookingIconText}>{isFlight ? 'Flight' : 'Stay'}</Text>
                  </View>
                  <View style={styles.backpackCardMain}>
                    <Text style={styles.backpackName} numberOfLines={1}>{bookingTitle(booking)}</Text>
                    <Text style={styles.backpackMeta} numberOfLines={1}>
                      {booking.status}
                      {booking.amount_thb != null ? ` - ${booking.amount_thb.toLocaleString()} THB` : ''}
                    </Text>
                    {flightCopy ? (
                      <Text style={styles.backpackCopy} numberOfLines={1}>{flightCopy}</Text>
                    ) : null}
                  </View>
                  <Btn
                    sm
                    solid
                    onPress={() => void addBackpackBooking(booking)}
                    loading={addingBackpackId === `booking:${booking.id}`}
                  >
                    Add
                  </Btn>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </>
  );

  const sidePanel = sidePanelOpen ? (
    <View style={[styles.sidePanel, isPhone && styles.sidePanelPhone]}>
      <View style={styles.sideTabStrip}>
        {sideTabs.map((tab) => {
          const active = tab === activeSideTab;
          const count = tab === 'backpack' ? backpackStops.length + bookedItems.length : stayItems.length;
          return (
            <PressableScale
              key={tab}
              style={[styles.sideTab, active && styles.sideTabActive]}
              onPress={() => setActiveSideTab(tab)}
              accessibilityLabel={`Open ${tab} tab`}
            >
              <Text style={[styles.sideTabText, active && styles.sideTabTextActive]}>
                {tab === 'stays' ? 'Stays' : `Backpack ${count}`}
              </Text>
              <PressableScale
                style={styles.sideTabClose}
                onPress={() => closeSideTab(tab)}
                accessibilityLabel={`Close ${tab} tab`}
              >
                <Text style={[styles.sideTabCloseText, active && styles.sideTabTextActive]}>x</Text>
              </PressableScale>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.sidePanelBody}>
        {activeSideTab === 'stays' ? stayTabContent : backpackTabContent}
      </View>
    </View>
  ) : null;

  const mapBlock = (
    <MapView
      initialLatitude={mapCenter?.latitude ?? fallback.latitude}
      initialLongitude={mapCenter?.longitude ?? fallback.longitude}
      initialZoom={12}
      posts={pins}
      route={stopRoute}
      activeId={mapActiveId}
      onSelectPost={(pinId) => {
        if (pinId.startsWith('stay:')) {
          setSelectedStayOfferId(pinId.slice(5));
          setSelectedStopId(null);
          return;
        }
        setSelectedStayOfferId(null);
        setSelectedStopId(pinId);
      }}
      onHoverPost={(pinId) => setHoveredStayOfferId(pinId?.startsWith('stay:') ? pinId.slice(5) : null)}
      center={mapCenter}
      onMapPress={onMapPress}
    >
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoTitle}>{trip.title}</Text>
        <Text style={styles.routeInfoSub}>{stops.length} stop{stops.length !== 1 ? 's' : ''} · tap map to add</Text>
      </View>
      {sidePanel}
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
        <Btn sm onPress={() => openSideTab('backpack')}>
          Backpack {backpackStops.length + bookedItems.length}
        </Btn>
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
