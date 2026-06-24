import { request } from '../http';
import type { TripMessageItem } from '../types';

/** Collaborator-only trip chat. `after` (ISO) fetches only newer messages. */
export async function fetchMessages(tripId: string, after?: string): Promise<TripMessageItem[]> {
  const q = after ? `?after=${encodeURIComponent(after)}` : '';
  return request<TripMessageItem[]>('GET', `/trips/${tripId}/messages${q}`);
}

export async function sendMessage(tripId: string, body: string): Promise<TripMessageItem> {
  return request<TripMessageItem>('POST', `/trips/${tripId}/messages`, { body });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await request<void>('DELETE', `/messages/${messageId}`);
}
