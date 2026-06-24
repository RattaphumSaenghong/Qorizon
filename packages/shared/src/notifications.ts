import type { Author } from './trips';

export const NOTIFICATION_TYPE = [
  'live_batch',
  'follow',
  'like',
  'comment',
  'trip_invite',
  'trip_message',
  'member_accepted',
  'member_declined',
  'inventory_item',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  actor: Author | null;
  trip: { id: string; title: string; stage: string | null } | null;
  stop_id: string | null;
  batch_id: string | null;
}

export interface UnreadCountResponse {
  unread: number;
}
