// Auth contract — request/response shapes for the /auth endpoints.
import type { UserLanguage } from './enums';

export interface SignupRequest {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
  language?: UserLanguage;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

/** Returned on signup/login/refresh. */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** The authenticated user's public profile (no email/password). */
export interface AuthUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  real_name: string | null;
  phone: string | null; // only populated for yourself or trip co-members
  language: UserLanguage;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}
