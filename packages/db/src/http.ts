/**
 * Trailr API HTTP client.
 *
 * Replaces the old supabase-js client. Holds the base URL + the JWT pair
 * (access + refresh) in memory, persisted via a platform StorageAdapter.
 * Attaches the Bearer token, and transparently refreshes once on a 401.
 */

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const ACCESS_KEY = 'trailr.access_token';
const REFRESH_KEY = 'trailr.refresh_token';

interface Config {
  baseUrl: string;
  storage: StorageAdapter;
}

let config: Config | null = null;
let accessToken: string | null = null;
let refreshToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Call once at app startup (synchronous — token load happens in loadSession). */
export function createApiClient(baseUrl: string, storage: StorageAdapter): void {
  config = { baseUrl: baseUrl.replace(/\/$/, ''), storage };
}

function cfg(): Config {
  if (!config) {
    throw new Error('[trailr/db] API client not initialised. Call createApiClient() first.');
  }
  return config;
}

export function getAccessToken(): string | null {
  return accessToken;
}
export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await cfg().storage.setItem(ACCESS_KEY, access);
  await cfg().storage.setItem(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await cfg().storage.removeItem(ACCESS_KEY);
  await cfg().storage.removeItem(REFRESH_KEY);
}

/** Load persisted tokens into memory (call before first authed request). */
export async function loadTokens(): Promise<void> {
  accessToken = (await cfg().storage.getItem(ACCESS_KEY)) ?? null;
  refreshToken = (await cfg().storage.getItem(REFRESH_KEY)) ?? null;
}

async function raw(
  method: string,
  path: string,
  body: unknown,
  withAuth: boolean,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${cfg().baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      const res = await raw('POST', '/auth/refresh', { refresh_token: refreshToken }, false);
      if (!res.ok) {
        await clearTokens();
        return false;
      }
      const data = await res.json();
      await setTokens(data.access_token, data.refresh_token);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export interface RequestOpts {
  auth?: boolean; // default true
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOpts = {},
): Promise<T> {
  const withAuth = opts.auth ?? true;
  let res = await raw(method, path, body, withAuth);

  if (res.status === 401 && withAuth && refreshToken) {
    const ok = await tryRefresh();
    if (ok) res = await raw(method, path, body, true);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || res.statusText;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}
