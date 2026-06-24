import { useQuery } from '@tanstack/react-query';
import { searchAll, searchUsers, searchTrips } from '../queries/search';

/** Combined overlay search — top-5 per group. Enabled when q >= 2 chars. */
export function useSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => searchAll(trimmed, 5),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
  });
}

/** Full people list for /search screen. */
export function useSearchUsers(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['search', 'users', trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
  });
}

/** Full trips list for /search screen. */
export function useSearchTrips(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['search', 'trips', trimmed],
    queryFn: () => searchTrips(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
  });
}
