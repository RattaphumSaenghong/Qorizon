import { request } from '../http';
import type { BookingType, InventoryItemRow } from '../types';

export async function fetchInventory(type?: BookingType): Promise<InventoryItemRow[]> {
  const q = type ? `?type=${type}` : '';
  return request<InventoryItemRow[]>('GET', `/inventory${q}`);
}

export async function matchInventoryItem(id: string, tripId: string): Promise<InventoryItemRow> {
  return request<InventoryItemRow>('PATCH', `/inventory/${id}/match`, { trip_id: tripId });
}

export async function dismissInventoryItem(id: string): Promise<InventoryItemRow> {
  return request<InventoryItemRow>('PATCH', `/inventory/${id}/dismiss`);
}
