import type { Media, Stop, User } from '@prisma/client';
import type { MediaRow, StopRow, StopWithMedia } from '@trailr/shared';
import { toAuthor } from '../trips/trip.mapper';
import { iso, dateOnly } from '../../common/dates';

export function toMediaRow(m: Media): MediaRow {
  return {
    id: m.id,
    stop_id: m.stop_id,
    user_id: m.user_id,
    type: m.type as MediaRow['type'],
    url: m.url,
    cdn_url: m.cdn_url,
    latitude: m.latitude,
    longitude: m.longitude,
    captured_at: iso(m.captured_at),
    duration_secs: m.duration_secs,
    size_bytes: m.size_bytes === null ? null : Number(m.size_bytes), // BigInt → number (JSON-safe)
    sort_order: m.sort_order,
    created_at: m.created_at.toISOString(),
  };
}

export function toStopRow(s: Stop): StopRow {
  return {
    id: s.id,
    trip_id: s.trip_id,
    day_id: s.day_id,
    user_id: s.user_id,
    status: s.status as StopRow['status'],
    category: s.category as StopRow['category'],
    location_name: s.location_name,
    latitude: s.latitude,
    longitude: s.longitude,
    place_id: s.place_id,
    planned_time: s.planned_time,
    duration_mins: s.duration_mins,
    sort_order: s.sort_order,
    notes: s.notes,
    caption: s.caption,
    captured_at: iso(s.captured_at),
    batch_date: dateOnly(s.batch_date),
    feed_eligible: s.feed_eligible,
    like_count: s.like_count,
    comment_count: s.comment_count,
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
  };
}

type StopRelations = Stop & {
  media: Media[];
  author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export function toStopWithMedia(s: StopRelations): StopWithMedia {
  return {
    ...toStopRow(s),
    media: s.media.map(toMediaRow),
    author: toAuthor(s.author),
  };
}
