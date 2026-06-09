/** Storage abstraction — swap providers (local disk, Cloudflare R2, S3) without touching callers. */
export const STORAGE = Symbol('STORAGE');

export interface StorageService {
  /** Store bytes at `key`. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Public URL to read the object back. */
  publicUrl(key: string): string;
  /** Delete the object (best-effort). */
  delete(key: string): Promise<void>;
}
