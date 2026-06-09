// Domain enums — single source of truth for both api (validation) and app (types).
// Mirror the CHECK constraints from the original SQL schema.

export const STOP_STATUS = ['planned', 'visited', 'skipped'] as const;
export type StopStatus = (typeof STOP_STATUS)[number];

export const STOP_CATEGORY = [
  'place', 'landmark', 'food', 'activity', 'hotel', 'flight', 'transport', 'note',
] as const;
export type StopCategory = (typeof STOP_CATEGORY)[number];

export const TRIP_STATUS = ['draft', 'active', 'completed'] as const;
export type TripStatus = (typeof TRIP_STATUS)[number];

export const TRIP_VISIBILITY = ['public', 'followers', 'link_only', 'private'] as const;
export type TripVisibility = (typeof TRIP_VISIBILITY)[number];

export const LIVE_CADENCE = ['hourly', 'daily', 'manual'] as const;
export type LiveCadence = (typeof LIVE_CADENCE)[number];

export const MEDIA_TYPE = ['photo', 'video', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPE)[number];

export const FORK_MODE = ['full', 'skim'] as const;
export type ForkMode = (typeof FORK_MODE)[number];

export const USER_LANGUAGE = ['th', 'en'] as const;
export type UserLanguage = (typeof USER_LANGUAGE)[number];
