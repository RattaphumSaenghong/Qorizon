import type { Author } from './trips';

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
}

export interface TripSearchResult {
  id: string;
  title: string;
  destination: string | null;
  cover_image_url: string | null;
  stage: 'planning' | 'living' | 'album';
  author: Author;
}

export interface SearchResults {
  users: UserSearchResult[];
  trips: TripSearchResult[];
}
