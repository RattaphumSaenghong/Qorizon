import type { Author } from './trips';

export type MemberStatus = 'pending' | 'accepted' | 'declined';

/** A person on a trip (owner-invited). */
export interface TripMemberItem {
  id: string;
  trip_id: string;
  user_id: string;
  role: string; // owner | editor | viewer
  status: MemberStatus;
  user: Author & { real_name: string | null };
}

/** A pending invite shown to the invitee. */
export interface TripInviteItem {
  id: string; // member row id
  trip_id: string;
  status: MemberStatus;
  trip: { id: string; title: string; destination: string | null; cover_image_url: string | null };
  inviter: Author | null;
}

export interface InviteMemberRequest {
  user_id: string;
}

export interface RespondInviteRequest {
  status: 'accepted' | 'declined';
}
