import {
  request,
  setTokens,
  clearTokens,
  loadTokens,
  getAccessToken,
  getRefreshToken,
} from '../http';
import type { UserRow, UserLanguage } from '../types';

/** Auth user == public profile shape (the API never returns email/password). */
export type AuthUser = UserRow;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface SignupPayload {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
  language?: UserLanguage;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await request<AuthResponse>('POST', '/auth/login', { email, password }, { auth: false });
  await setTokens(res.access_token, res.refresh_token);
  return res.user;
}

export async function signup(payload: SignupPayload): Promise<AuthUser> {
  const res = await request<AuthResponse>('POST', '/auth/signup', payload, { auth: false });
  await setTokens(res.access_token, res.refresh_token);
  return res.user;
}

export async function logout(): Promise<void> {
  const rt = getRefreshToken();
  if (rt) {
    await request('POST', '/auth/logout', { refresh_token: rt }, { auth: false }).catch(() => undefined);
  }
  await clearTokens();
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>('GET', '/auth/me');
}

/** Bootstrap on app start: load persisted tokens, return the user if still valid. */
export async function loadSession(): Promise<AuthUser | null> {
  await loadTokens();
  if (!getAccessToken()) return null;
  try {
    return await getMe();
  } catch {
    await clearTokens();
    return null;
  }
}
