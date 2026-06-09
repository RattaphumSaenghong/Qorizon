import type { AuthUser } from './auth';
import type { UserLanguage } from './enums';

/** Public profile shape (same fields as the authed user — never email/password). */
export type PublicUser = AuthUser;

export interface UpdateUserRequest {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  language?: UserLanguage;
}

export interface FollowStateResponse {
  is_following: boolean;
}
