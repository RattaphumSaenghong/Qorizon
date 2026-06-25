/**
 * Trip Builder — leaf presentational components (stop cards, droppable day
 * sections, draggable rows, logistics blocks). Extracted from app/builder/[id].tsx.
 */
import React from 'react';
import { View, Text, Image } from 'react-native';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { StopWithMedia } from '@trailr/db';
import { Chip } from '../components/Chip';
import { Btn } from '../components/Btn';
import { CoverImage } from '../components/CoverImage';
import { PressableScale } from '../components/PressableScale';
import { styles } from './styles';
import type { LogisticsType } from './helpers';
import { flightRowLine } from '../lib/bookingDisplay';

export const StopCard = React.memo(function StopCard({
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
});

export function DroppableDaySection({
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

export const DraggableStopRow = React.memo(function DraggableStopRow({
  stop, currency, index, selected, onSelect, onEdit, onRemove, onMove, canUp, canDown,
}: {
  stop: StopWithMedia; currency: string; index?: number; selected?: boolean;
  onSelect: (id: string) => void; onEdit: (stop: StopWithMedia) => void; onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void; canUp: boolean; canDown: boolean;
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
        <StopCard
          stop={stop}
          currency={currency}
          index={index}
          selected={selected}
          onSelect={() => onSelect(stop.id)}
          onEdit={() => onEdit(stop)}
          onRemove={() => onRemove(stop.id)}
          onUp={() => onMove(stop.id, -1)}
          onDown={() => onMove(stop.id, 1)}
          canUp={canUp}
          canDown={canDown}
        />
      </View>
    </View>
  );
});

export const LogisticsBlock = React.memo(function LogisticsBlock({
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
            ? (flightRowLine(stop.meta) ?? [stop.planned_start, stop.planned_end].filter(Boolean).join(' - ')) || stop.notes || 'Flight details'
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
});
