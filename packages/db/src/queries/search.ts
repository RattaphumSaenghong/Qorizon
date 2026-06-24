import { request } from '../http';
import type { UserSearchResult, TripSearchResult, SearchResults } from '../types';

export async function searchAll(q: string, limit = 5): Promise<SearchResults> {
  return request<SearchResults>('GET', `/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function searchUsers(q: string, limit = 20): Promise<UserSearchResult[]> {
  return request<UserSearchResult[]>('GET', `/search/users?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function searchTrips(q: string, limit = 20): Promise<TripSearchResult[]> {
  return request<TripSearchResult[]>('GET', `/search/trips?q=${encodeURIComponent(q)}&limit=${limit}`);
}
