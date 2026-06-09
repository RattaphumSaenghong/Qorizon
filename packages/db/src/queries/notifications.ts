import { request } from '../http';
import type { NotificationItem } from '../types';

export async function fetchNotifications(limit = 50): Promise<NotificationItem[]> {
  return request<NotificationItem[]>('GET', `/notifications?limit=${limit}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await request<{ unread: number }>('GET', '/notifications/unread-count');
  return res.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await request<void>('PATCH', `/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await request<{ updated: number }>('POST', '/notifications/read-all');
  return res.updated;
}
