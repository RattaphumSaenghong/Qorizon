/**
 * Client entry point. The backend is now the Trailr NestJS REST API
 * (was supabase-js). The HTTP client lives in ./http.
 */
export { createApiClient, ApiError } from './http';
export type { StorageAdapter } from './http';
