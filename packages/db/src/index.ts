// Client
export { createApiClient, ApiError } from './client';
export type { StorageAdapter } from './client';

// Types
export * from './types';

// Auth
export * from './queries/auth';

// Query functions (framework-agnostic)
export * from './queries/trips';
export * from './queries/stops';
export * from './queries/users';
export * from './queries/albums';
export * from './queries/live';
export * from './queries/notifications';
export * from './queries/media';
export * from './queries/bookings';
export * from './queries/hotel-search';
export * from './queries/inventory';
export * from './queries/saved';
export * from './queries/comments';
export * from './queries/members';
export * from './queries/messages';
export * from './queries/search';
export * from './queries/recommendations';

// React Query hooks
export * from './hooks/useTrip';
export * from './hooks/useFeed';
export * from './hooks/useUser';
export * from './hooks/useAlbum';
export * from './hooks/useLive';
export * from './hooks/useNotifications';
export * from './hooks/useMedia';
export * from './hooks/useBookings';
export * from './hooks/useHotelSearch';
export * from './hooks/useInventory';
export * from './hooks/useSaved';
export * from './hooks/useComments';
export * from './hooks/useMembers';
export * from './hooks/useMessages';
export * from './hooks/useSearch';
export * from './hooks/useHotelRecommendations';
