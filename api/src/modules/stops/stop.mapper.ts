import type { Media, Stop, StopAssignee, User } from '@prisma/client';
import type { AuthorLite, MediaRow, StopRow, StopWithMedia } from '@trailr/shared';
import { toAuthor } from '../trips/trip.mapper';
import { iso, dateOnly } from '../../common/dates';

export function toMediaRow(m: Media): MediaRow {
  return {
    id: m.id,
    trip_id: m.trip_id,
    stop_id: m.stop_id,
    user_id: m.user_id,
    type: m.type as MediaRow['type'],
    visibility: (m.visibility ?? 'shared') as MediaRow['visibility'],
    url: m.url,
    cdn_url: m.cdn_url,
    latitude: m.latitude,
    longitude: m.longitude,
    captured_at: iso(m.captured_at),
    duration_secs: m.duration_secs,
    size_bytes: m.size_bytes === null ? null : Number(m.size_bytes),
    sort_order: m.sort_order,
    created_at: m.created_at.toISOString(),
  };
}

type AssigneeRelation = StopAssignee & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export function toStopRow(s: Stop & { assignees?: AssigneeRelation[] }): StopRow {
  return {
    id: s.id,
    trip_id: s.trip_id,
    day_id: s.day_id,
    user_id: s.user_id,
    status: s.status as StopRow['status'],
    scope: s.scope as StopRow['scope'],
    category: s.category as StopRow['category'],
    location_name: s.location_name,
    latitude: s.latitude,
    longitude: s.longitude,
    place_id: s.place_id,
    planned_start: s.planned_start,
    planned_end: s.planned_end,
    duration_mins: s.duration_mins,
    cost: s.cost,
    paid_by: s.paid_by,
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
    assignees: (s.assignees ?? []).map((a) => toAuthor(a.user) as AuthorLite),
  };
}

type StopRelations = Stop & {
  media: Media[];
  author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  assignees?: AssigneeRelation[];
};

export function toStopWithMedia(s: StopRelations): StopWithMedia {
  return {
    ...toStopRow(s),
    media: s.media.map(toMediaRow),
    author: toAuthor(s.author),
  };
}
