import type { Trip, TripDay, User } from '@prisma/client';
import type { Author, TripDayRow, TripRow, TripWithAuthor } from '@trailr/shared';
import { dateOnly } from '../../common/dates';

export function toTripRow(t: Trip): TripRow {
  return {
    id: t.id,
    user_id: t.user_id,
    title: t.title,
    description: t.description,
    cover_image_url: t.cover_image_url,
    status: t.status as TripRow['status'],
    stage: t.stage as TripRow['stage'],
    destination: t.destination,
    budget: t.budget,
    budget_currency: t.budget_currency,
    live_mode: t.live_mode,
    live_cadence: t.live_cadence as TripRow['live_cadence'],
    visibility: t.visibility as TripRow['visibility'],
    forked_from_id: t.forked_from_id,
    fork_count: t.fork_count,
    start_date: dateOnly(t.start_date),
    end_date: dateOnly(t.end_date),
    album_overrides: t.album_overrides ?? null,
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
  };
}

export function toAuthor(u: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>): Author {
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
  };
}

export function toTripWithAuthor(
  t: Trip & { author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> },
): TripWithAuthor {
  return { ...toTripRow(t), author: toAuthor(t.author) };
}

export function toTripDayRow(d: TripDay): TripDayRow {
  return {
    id: d.id,
    trip_id: d.trip_id,
    day_number: d.day_number,
    place: d.place,
    date: dateOnly(d.date),
  };
}
