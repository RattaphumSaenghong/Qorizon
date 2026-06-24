import type { Author } from './trips';

export interface TripMessageItem {
  id: string;
  trip_id: string;
  body: string;
  created_at: string;
  author: Author;
}

export interface CreateMessageRequest {
  body: string;
}
