import { request } from '../http';
import type { SavedItem } from '../types';

export async function fetchSaved(): Promise<SavedItem[]> {
  return request<SavedItem[]>('GET', '/saved');
}

export async function saveItem(input: { stop_id?: string; trip_id?: string }): Promise<SavedItem> {
  return request<SavedItem>('POST', '/saved', input);
}

export async function unsaveItem(id: string): Promise<void> {
  await request<void>('DELETE', `/saved/${id}`);
}

/** Toggle a bookmark by target. Returns the new saved state. */
export async function toggleSave(input: { stop_id?: string; trip_id?: string }): Promise<boolean> {
  const res = await request<{ saved: boolean }>('POST', '/saved/toggle', input);
  return res.saved;
}
